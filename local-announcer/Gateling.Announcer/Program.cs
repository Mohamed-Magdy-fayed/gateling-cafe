using System.Net;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.Hosting.WindowsServices;
using NAudio.CoreAudioApi;
using NAudio.Wave;

const string DefaultServiceName = "GatelingAnnouncer";

// Self-install/uninstall helpers so the user can run a single EXE.
// Requires an elevated (Administrator) terminal.
if (args.Contains("--install-service", StringComparer.OrdinalIgnoreCase))
{
    var serviceName = WindowsServiceInstaller.GetArgValue(args, "--service-name") ?? DefaultServiceName;
    WindowsServiceInstaller.InstallWindowsService(serviceName);
    return;
}

if (args.Contains("--uninstall-service", StringComparer.OrdinalIgnoreCase))
{
    var serviceName = WindowsServiceInstaller.GetArgValue(args, "--service-name") ?? DefaultServiceName;
    WindowsServiceInstaller.UninstallWindowsService(serviceName);
    return;
}

var builder = WebApplication.CreateBuilder(args);

if (WindowsServiceHelpers.IsWindowsService() || args.Contains("--service", StringComparer.OrdinalIgnoreCase))
{
    builder.Host.UseWindowsService();
}

builder.Services.Configure<JsonOptions>(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.WriteIndented = false;
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var soundsDir = Path.Combine(AppContext.BaseDirectory, "sounds");
Directory.CreateDirectory(soundsDir);
builder.Services.AddSingleton(new AnnouncerPaths(SoundsDir: soundsDir));

var schedulesPath = Path.Combine(AppContext.BaseDirectory, "schedules.json");
builder.Services.AddSingleton(new SchedulerPaths(SchedulesPath: schedulesPath));

builder.Services.AddSingleton(_ =>
    Channel.CreateUnbounded<AnnouncementJob>(new UnboundedChannelOptions
    {
        SingleReader = true,
        SingleWriter = false,
    }));

builder.Services.AddHostedService<AnnouncementWorker>();
builder.Services.AddSingleton<ReservationScheduler>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<ReservationScheduler>());

var app = builder.Build();

app.UseCors();

var port = Environment.GetEnvironmentVariable("GATELING_ANNOUNCER_PORT")?.Trim();
var listenPort = 17777;
if (!string.IsNullOrWhiteSpace(port) && int.TryParse(port, out var parsedPort))
{
    listenPort = parsedPort;
}

app.Urls.Clear();
app.Urls.Add($"http://127.0.0.1:{listenPort}");

app.MapGet("/", () => Results.Ok(new { ok = true, endpoints = new[] { "/health", "/announce", "/announce-tts", "/test-beep" } }));
app.MapGet("/health", () => Results.Ok(new { ok = true }));

app.MapPost("/announce", async (AnnouncementPayload payload, Channel<AnnouncementJob> channel) =>
{
    if (payload.Urls is null || payload.Urls.Count == 0)
    {
        return Results.BadRequest(new { error = "urls is required" });
    }

    var urls = payload.Urls
        .Select(u => (u ?? string.Empty).Trim())
        .Where(u => !string.IsNullOrWhiteSpace(u))
        .ToList();

    if (urls.Count == 0)
    {
        return Results.BadRequest(new { error = "urls is required" });
    }

    var job = new AnnouncementJob(
        Urls: urls,
        LocalFiles: new List<string>(),
        Duck: payload.Duck ?? true,
        DuckVolumeScalar: payload.DuckVolumeScalar,
        RequestedAtUtc: DateTimeOffset.UtcNow,
        Beep: null);

    await channel.Writer.WriteAsync(job);
    return Results.Accepted(value: new { queued = true, count = urls.Count });
});

app.MapPost("/announce-tts", async (
    AnnounceTtsPayload payload,
    Channel<AnnouncementJob> channel,
    AnnouncerPaths paths,
    HttpContext httpContext) =>
{
    if (payload.Clips is null || payload.Clips.Count == 0)
    {
        return Results.BadRequest(new { error = "clips is required" });
    }

    var localFiles = new List<string>();

    foreach (var clip in payload.Clips)
    {
        var key = (clip.Key ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(key))
        {
            return Results.BadRequest(new { error = "clip.key is required" });
        }

        // Restrict filename to avoid path traversal.
        if (key.Any(ch => !(char.IsLetterOrDigit(ch) || ch == '-' || ch == '_')))
        {
            return Results.BadRequest(new { error = "clip.key contains invalid characters" });
        }

        var filePath = Path.Combine(paths.SoundsDir, $"{key}.mp3");
        localFiles.Add(filePath);

        if (File.Exists(filePath))
        {
            continue;
        }

        var base64 = (clip.Base64 ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(base64))
        {
            return Results.Conflict(new { error = "clip not cached locally", key });
        }

        var payloadOnly = base64.Contains(',')
            ? base64[(base64.IndexOf(',') + 1)..]
            : base64;

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(payloadOnly);
        }
        catch
        {
            return Results.BadRequest(new { error = "clip.base64 is not valid base64" });
        }

        var tmpPath = filePath + ".tmp";
        await File.WriteAllBytesAsync(tmpPath, bytes, httpContext.RequestAborted);
        File.Move(tmpPath, filePath, overwrite: true);
    }

    var job = new AnnouncementJob(
        Urls: new List<string>(),
        LocalFiles: localFiles,
        Duck: payload.Duck ?? true,
        DuckVolumeScalar: payload.DuckVolumeScalar,
        RequestedAtUtc: DateTimeOffset.UtcNow,
        Beep: null);

    await channel.Writer.WriteAsync(job, httpContext.RequestAborted);
    return Results.Accepted(value: new { queued = true, count = localFiles.Count });
});

app.MapPost("/schedule-reservation", async (
    ScheduleReservationPayload payload,
    ReservationScheduler scheduler,
    HttpContext httpContext) =>
{
    if (string.IsNullOrWhiteSpace(payload.ReservationId))
    {
        return Results.BadRequest(new { error = "reservationId is required" });
    }

    if (payload.EndTimeUtc is null)
    {
        return Results.BadRequest(new { error = "endTimeUtc is required" });
    }

    var id = payload.ReservationId.Trim();
    if (id.Length > 128)
    {
        return Results.BadRequest(new { error = "reservationId is too long" });
    }

    var endUtc = DateTime.SpecifyKind(payload.EndTimeUtc.Value, DateTimeKind.Utc);
    var customerName = (payload.CustomerName ?? string.Empty).Trim();

    // Pre-cache clips if provided (optional)
    var clips = payload.Clips ?? new List<TtsClip>();
    await scheduler.UpsertAsync(new ScheduledReservation(
        ReservationId: id,
        CustomerName: customerName,
        EndTimeUtc: endUtc,
        Clips: clips,
        Duck: payload.Duck ?? true,
        DuckVolumeScalar: payload.DuckVolumeScalar),
        httpContext.RequestAborted);

    return Results.Ok(new { ok = true });
});

app.MapPost("/cancel-reservation", async (
    CancelReservationPayload payload,
    ReservationScheduler scheduler,
    HttpContext httpContext) =>
{
    if (string.IsNullOrWhiteSpace(payload.ReservationId))
    {
        return Results.BadRequest(new { error = "reservationId is required" });
    }

    await scheduler.RemoveAsync(payload.ReservationId.Trim(), httpContext.RequestAborted);
    return Results.Ok(new { ok = true });
});

app.MapPost("/test-beep", async (HttpContext httpContext, Channel<AnnouncementJob> channel) =>
{
    TestBeepPayload payload = new(
        FrequencyHz: null,
        DurationMs: null,
        Duck: null,
        DuckVolumeScalar: null);

    if (httpContext.Request.ContentLength is > 0 &&
        httpContext.Request.ContentType?.StartsWith("application/json", StringComparison.OrdinalIgnoreCase) == true)
    {
        try
        {
            var parsed = await httpContext.Request.ReadFromJsonAsync<TestBeepPayload>(
                cancellationToken: httpContext.RequestAborted);
            if (parsed is not null)
            {
                payload = parsed;
            }
        }
        catch
        {
            return Results.BadRequest(new { error = "Invalid JSON payload" });
        }
    }

    var durationMs = payload.DurationMs ?? 900;
    var frequencyHz = payload.FrequencyHz ?? 880;
    durationMs = Math.Clamp(durationMs, 100, 10_000);
    frequencyHz = Math.Clamp(frequencyHz, 80, 4000);

    var job = new AnnouncementJob(
        Urls: new List<string>(),
        LocalFiles: new List<string>(),
        Duck: payload.Duck ?? true,
        DuckVolumeScalar: payload.DuckVolumeScalar,
        RequestedAtUtc: DateTimeOffset.UtcNow,
        Beep: new BeepJob(FrequencyHz: frequencyHz, DurationMs: durationMs));

    await channel.Writer.WriteAsync(job, httpContext.RequestAborted);
    return Results.Accepted(value: new { queued = true, type = "beep", frequencyHz, durationMs });
});

app.Run();

sealed record AnnouncerPaths(string SoundsDir);
sealed record SchedulerPaths(string SchedulesPath);

sealed record AnnouncementPayload(
    List<string> Urls,
    bool? Duck,
    float? DuckVolumeScalar);

sealed record AnnounceTtsPayload(
    List<TtsClip> Clips,
    bool? Duck,
    float? DuckVolumeScalar);

sealed record TtsClip(
    string Key,
    string? Base64,
    string? ContentType);

sealed record TestBeepPayload(
    int? FrequencyHz,
    int? DurationMs,
    bool? Duck,
    float? DuckVolumeScalar);

sealed record ScheduleReservationPayload(
    string ReservationId,
    DateTime? EndTimeUtc,
    string? CustomerName,
    List<TtsClip>? Clips,
    bool? Duck,
    float? DuckVolumeScalar);

sealed record CancelReservationPayload(string ReservationId);

sealed record AnnouncementJob(
    List<string> Urls,
    List<string> LocalFiles,
    bool Duck,
    float? DuckVolumeScalar,
    DateTimeOffset RequestedAtUtc,
    BeepJob? Beep);

sealed record BeepJob(
    int FrequencyHz,
    int DurationMs);

sealed record ScheduledReservation(
    string ReservationId,
    string CustomerName,
    DateTime EndTimeUtc,
    List<TtsClip> Clips,
    bool Duck,
    float? DuckVolumeScalar);

sealed class AnnouncementWorker : BackgroundService
{
    private readonly Channel<AnnouncementJob> _channel;
    private readonly ILogger<AnnouncementWorker> _logger;
    private readonly HttpClient _http;
    private readonly string _soundsDir;

    public AnnouncementWorker(Channel<AnnouncementJob> channel, ILogger<AnnouncementWorker> logger, AnnouncerPaths paths)
    {
        _channel = channel;
        _logger = logger;
        _soundsDir = paths.SoundsDir;
        Directory.CreateDirectory(_soundsDir);
        _http = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(45),
        };
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await HandleJob(job, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Announcer job failed");
            }
        }
    }

    private async Task HandleJob(AnnouncementJob job, CancellationToken ct)
    {
        var duckVolume = job.DuckVolumeScalar;
        if (!duckVolume.HasValue)
        {
            var envDuck = Environment.GetEnvironmentVariable("GATELING_ANNOUNCER_DUCK_VOLUME")?.Trim();
            if (!string.IsNullOrWhiteSpace(envDuck) && float.TryParse(envDuck, out var parsed))
            {
                duckVolume = parsed;
            }
        }

        var effectiveDuckVolume = Math.Clamp(duckVolume ?? 0.20f, 0.0f, 1.0f);

        MMDevice? device = null;
        DuckingHandle? ducking = null;
        try
        {
            if (job.Duck)
            {
                device = new MMDeviceEnumerator().GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia);
                ducking = DuckOtherAppSessions(device, effectiveDuckVolume, _logger);
            }

            if (job.Beep is not null)
            {
                ct.ThrowIfCancellationRequested();
                await PlayBeep(job.Beep, ct);
            }
            else if (job.LocalFiles.Count > 0)
            {
                foreach (var file in job.LocalFiles)
                {
                    ct.ThrowIfCancellationRequested();
                    await PlayFile(file, ct);
                }
            }
            else
            {
                foreach (var url in job.Urls)
                {
                    ct.ThrowIfCancellationRequested();
                    await PlayUrl(url, ct);
                }
            }
        }
        finally
        {
            try
            {
                ducking?.Dispose();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to restore ducked session volumes");
            }
            finally
            {
                device?.Dispose();
            }
        }
    }

    private sealed class DuckingHandle : IDisposable
    {
        private readonly List<(AudioSessionControl session, float original)> _sessions;
        private readonly ILogger _logger;
        private bool _disposed;

        public DuckingHandle(List<(AudioSessionControl session, float original)> sessions, ILogger logger)
        {
            _sessions = sessions;
            _logger = logger;
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;

            foreach (var (session, original) in _sessions)
            {
                try
                {
                    session.SimpleAudioVolume.Volume = original;
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Failed to restore session volume");
                }
                finally
                {
                    try
                    {
                        session.Dispose();
                    }
                    catch
                    {
                        // best-effort
                    }
                }
            }
        }
    }

    private static DuckingHandle DuckOtherAppSessions(MMDevice device, float duckVolumeScalar, ILogger logger)
    {
        // Duck other apps, but keep this announcer process at full volume.
        var currentPid = unchecked((uint)Environment.ProcessId);
        var ducked = new List<(AudioSessionControl session, float original)>();

        try
        {
            var sessionManager = device.AudioSessionManager;
            var sessions = sessionManager.Sessions;
            for (var i = 0; i < sessions.Count; i++)
            {
                var session = sessions[i];
                try
                {
                    // Skip sessions we can't attribute to a process, and skip ourselves.
                    uint pid;
                    try
                    {
                        pid = session.GetProcessID;
                    }
                    catch
                    {
                        pid = 0;
                    }

                    if (pid <= 0 || pid == currentPid)
                    {
                        session.Dispose();
                        continue;
                    }

                    var original = session.SimpleAudioVolume.Volume;
                    ducked.Add((session, original));
                    session.SimpleAudioVolume.Volume = duckVolumeScalar;
                }
                catch (Exception ex)
                {
                    logger.LogDebug(ex, "Failed to duck an audio session");
                    session.Dispose();
                }
            }
        }
        catch (Exception ex)
        {
            // If session enumeration fails, do not block playback.
            logger.LogWarning(ex, "Session ducking failed; continuing without ducking");
        }

        return new DuckingHandle(ducked, logger);
    }

    private async Task PlayUrl(string url, CancellationToken ct)
    {
        _logger.LogInformation("Playing {Url}", url);

        // Cache downloaded MP3s to disk for offline/retry scenarios.
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(url))).ToLowerInvariant()[..16];
        var filePath = Path.Combine(_soundsDir, $"url-{hash}.mp3");

        if (!File.Exists(filePath))
        {
            byte[] audioBytes;
            try
            {
                audioBytes = await _http.GetByteArrayAsync(url, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to download audio {Url}", url);
                return;
            }

            var tmpPath = filePath + ".tmp";
            await File.WriteAllBytesAsync(tmpPath, audioBytes, ct);
            File.Move(tmpPath, filePath, overwrite: true);
        }

        await PlayFile(filePath, ct);
    }

    private static async Task PlayBeep(BeepJob beep, CancellationToken ct)
    {
        // Generate a simple sine wave in-memory and play it.
        const int sampleRate = 44100;
        const short channels = 1;
        var durationSeconds = beep.DurationMs / 1000.0;
        var sampleCount = (int)(sampleRate * durationSeconds);
        if (sampleCount <= 0) return;

        // 16-bit PCM
        var buffer = new byte[sampleCount * 2];
        var amplitude = 0.25; // keep headroom
        var twoPiF = 2.0 * Math.PI * beep.FrequencyHz;

        for (var n = 0; n < sampleCount; n++)
        {
            var t = (double)n / sampleRate;
            var sample = amplitude * Math.Sin(twoPiF * t);
            var value = (short)Math.Clamp(sample * short.MaxValue, short.MinValue, short.MaxValue);
            buffer[n * 2] = (byte)(value & 0xFF);
            buffer[n * 2 + 1] = (byte)((value >> 8) & 0xFF);
        }

        var waveFormat = new WaveFormat(sampleRate, 16, channels);
        using var stream = new MemoryStream(buffer, writable: false);
        using var raw = new RawSourceWaveStream(stream, waveFormat);

        var tcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        using var output = new WaveOutEvent
        {
            DesiredLatency = 120,
            Volume = 1.0f,
        };

        output.PlaybackStopped += (_, args) =>
        {
            if (args.Exception is not null)
            {
                tcs.TrySetException(args.Exception);
            }
            else
            {
                tcs.TrySetResult();
            }
        };

        output.Init(raw);
        output.Play();

        await tcs.Task.WaitAsync(ct);
    }

    private static async Task PlayFile(string path, CancellationToken ct)
    {
        var tcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        using var reader = new MediaFoundationReader(path);
        using var output = new WaveOutEvent
        {
            DesiredLatency = 150,
            Volume = 1.0f,
        };

        output.PlaybackStopped += (_, args) =>
        {
            if (args.Exception is not null)
            {
                tcs.TrySetException(args.Exception);
            }
            else
            {
                tcs.TrySetResult();
            }
        };

        output.Init(reader);
        output.Play();

        await tcs.Task.WaitAsync(ct);
    }
}

sealed class ReservationScheduler : BackgroundService
{
    private static readonly TimeSpan StaleAnnouncementThreshold = TimeSpan.FromMinutes(10);
    private readonly ILogger<ReservationScheduler> _logger;
    private readonly SchedulerPaths _paths;
    private readonly AnnouncerPaths _announcerPaths;
    private readonly Channel<AnnouncementJob> _channel;
    private readonly Dictionary<string, ScheduledReservation> _items = new(StringComparer.OrdinalIgnoreCase);
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly HttpClient _http;

    public ReservationScheduler(
        ILogger<ReservationScheduler> logger,
        SchedulerPaths paths,
        AnnouncerPaths announcerPaths,
        Channel<AnnouncementJob> channel)
    {
        _logger = logger;
        _paths = paths;
        _announcerPaths = announcerPaths;
        _channel = channel;
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        await LoadAsync(cancellationToken);
        await base.StartAsync(cancellationToken);
    }

    public async Task UpsertAsync(ScheduledReservation reservation, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            // Pre-cache clips with base64 if provided
            await CacheClipsIfNeeded(reservation.Clips, ct);

            _items[reservation.ReservationId] = reservation;
            await SaveAsync(ct);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task RemoveAsync(string reservationId, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            _items.Remove(reservationId);
            await SaveAsync(ct);
        }
        finally
        {
            _gate.Release();
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            ScheduledReservation? next = null;

            await _gate.WaitAsync(stoppingToken);
            try
            {
                var nowUtc = DateTime.UtcNow;
                foreach (var item in _items.Values)
                {
                    if (item.EndTimeUtc <= nowUtc)
                    {
                        next = item;
                        break;
                    }
                }
            }
            finally
            {
                _gate.Release();
            }

            if (next is null)
            {
                await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                continue;
            }

            try
            {
                var nowUtc = DateTime.UtcNow;
                var overdue = nowUtc - next.EndTimeUtc;

                // Fire: announce locally immediately
                if (overdue <= StaleAnnouncementThreshold)
                {
                    var localFiles = next.Clips
                        .Select(c => (c.Key ?? string.Empty).Trim())
                        .Where(k => !string.IsNullOrWhiteSpace(k))
                        .Select(k => Path.Combine(_announcerPaths.SoundsDir, $"{k}.mp3"))
                        .Where(File.Exists)
                        .ToList();

                    if (localFiles.Count > 0)
                    {
                        await _channel.Writer.WriteAsync(new AnnouncementJob(
                            Urls: new List<string>(),
                            LocalFiles: localFiles,
                            Duck: next.Duck,
                            DuckVolumeScalar: next.DuckVolumeScalar,
                            RequestedAtUtc: DateTimeOffset.UtcNow,
                            Beep: null), stoppingToken);
                    }
                    else
                    {
                        // If clips weren't cached, at least beep.
                        await _channel.Writer.WriteAsync(new AnnouncementJob(
                            Urls: new List<string>(),
                            LocalFiles: new List<string>(),
                            Duck: next.Duck,
                            DuckVolumeScalar: next.DuckVolumeScalar,
                            RequestedAtUtc: DateTimeOffset.UtcNow,
                            Beep: new BeepJob(880, 500)), stoppingToken);
                    }
                }

                // Then call server to end reservation + revalidate (best effort)
                _ = Task.Run(() => EndOnServer(next.ReservationId, stoppingToken));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fire schedule for {ReservationId}", next.ReservationId);
            }
            finally
            {
                // Remove it so it doesn't fire again
                await RemoveAsync(next.ReservationId, stoppingToken);
            }
        }
    }

    private async Task LoadAsync(CancellationToken ct)
    {
        try
        {
            if (!File.Exists(_paths.SchedulesPath))
            {
                return;
            }

            var json = await File.ReadAllTextAsync(_paths.SchedulesPath, ct);
            var items = JsonSerializer.Deserialize<List<ScheduledReservation>>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            }) ?? new List<ScheduledReservation>();

            foreach (var item in items)
            {
                _items[item.ReservationId] = item;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load schedules.json");
        }
    }

    private async Task SaveAsync(CancellationToken ct)
    {
        var list = _items.Values.ToList();
        var json = JsonSerializer.Serialize(list);
        var tmp = _paths.SchedulesPath + ".tmp";
        await File.WriteAllTextAsync(tmp, json, ct);
        File.Move(tmp, _paths.SchedulesPath, overwrite: true);
    }

    private async Task CacheClipsIfNeeded(List<TtsClip> clips, CancellationToken ct)
    {
        foreach (var clip in clips)
        {
            var key = (clip.Key ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(key)) continue;
            if (key.Any(ch => !(char.IsLetterOrDigit(ch) || ch == '-' || ch == '_'))) continue;

            var filePath = Path.Combine(_announcerPaths.SoundsDir, $"{key}.mp3");
            if (File.Exists(filePath)) continue;

            var base64 = (clip.Base64 ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(base64)) continue;

            var payloadOnly = base64.Contains(',')
                ? base64[(base64.IndexOf(',') + 1)..]
                : base64;

            byte[] bytes;
            try
            {
                bytes = Convert.FromBase64String(payloadOnly);
            }
            catch
            {
                continue;
            }

            var tmp = filePath + ".tmp";
            await File.WriteAllBytesAsync(tmp, bytes, ct);
            File.Move(tmp, filePath, overwrite: true);
        }
    }

    private async Task EndOnServer(string reservationId, CancellationToken ct)
    {
        var url = Environment.GetEnvironmentVariable("GATELING_ANNOUNCER_END_URL")?.Trim();
        var token = Environment.GetEnvironmentVariable("GATELING_ANNOUNCER_END_TOKEN")?.Trim();
        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(token))
        {
            return;
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            request.Content = new StringContent(
                JsonSerializer.Serialize(new { id = reservationId }),
                Encoding.UTF8,
                "application/json");

            using var response = await _http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("End request failed: {Status}", (int)response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "End request failed");
        }
    }
}

static class WindowsServiceInstaller
{
    public static string? GetArgValue(string[] args, string key)
    {
        for (var i = 0; i < args.Length; i++)
        {
            if (string.Equals(args[i], key, StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                return args[i + 1];
            }

            if (args[i].StartsWith(key + "=", StringComparison.OrdinalIgnoreCase))
            {
                return args[i].Substring(key.Length + 1);
            }
        }

        return null;
    }

    public static void InstallWindowsService(string serviceName)
    {
        var exePath = Environment.ProcessPath;
        if (string.IsNullOrWhiteSpace(exePath))
        {
            Console.Error.WriteLine("Unable to determine exe path.");
            Environment.Exit(1);
            return;
        }

        // sc.exe syntax requires spaces after '='.
        var binPathArg = $"binPath= \"\\\"{exePath}\\\" --service\"";
        RunSc($"create {serviceName} {binPathArg} start= auto DisplayName= \"Gateling Announcer\"");
        RunSc($"description {serviceName} \"Gateling local announcer (callouts)\"");
        RunSc($"start {serviceName}");
        Console.WriteLine($"Installed and started Windows Service '{serviceName}'.");
    }

    public static void UninstallWindowsService(string serviceName)
    {
        try
        {
            RunSc($"stop {serviceName}");
        }
        catch
        {
            // ignore
        }

        RunSc($"delete {serviceName}");
        Console.WriteLine($"Uninstalled Windows Service '{serviceName}'.");
    }

    private static void RunSc(string arguments)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "sc.exe",
            Arguments = arguments,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = false,
        };

        using var proc = Process.Start(psi);
        if (proc is null)
        {
            throw new InvalidOperationException("Failed to start sc.exe");
        }

        var stdout = proc.StandardOutput.ReadToEnd();
        var stderr = proc.StandardError.ReadToEnd();
        proc.WaitForExit();

        if (proc.ExitCode != 0)
        {
            throw new InvalidOperationException($"sc.exe failed ({proc.ExitCode}). {stdout} {stderr}");
        }
    }
}
