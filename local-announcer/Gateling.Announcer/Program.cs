using System.Net;
using System.Net.Http.Json;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using System.Runtime.InteropServices;
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

var isUserAgent = args.Contains("--user-agent", StringComparer.OrdinalIgnoreCase);
var isServiceHost = !isUserAgent && (WindowsServiceHelpers.IsWindowsService() || args.Contains("--service", StringComparer.OrdinalIgnoreCase));

var builder = WebApplication.CreateBuilder(args);

if (isServiceHost)
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

if (!isUserAgent)
{
    builder.Services.AddSingleton<ReservationScheduler>();
    builder.Services.AddHostedService(sp => sp.GetRequiredService<ReservationScheduler>());
}

var app = builder.Build();

app.UseCors();

var port = Environment.GetEnvironmentVariable("GATELING_ANNOUNCER_PORT")?.Trim();
var listenPort = isUserAgent ? 17778 : 17777;

var portArg = WindowsServiceInstaller.GetArgValue(args, "--port")?.Trim();
if (!string.IsNullOrWhiteSpace(portArg) && int.TryParse(portArg, out var parsedPortArg))
{
    listenPort = parsedPortArg;
}
else
{
    var envName = isUserAgent ? "GATELING_ANNOUNCER_USER_AGENT_PORT" : "GATELING_ANNOUNCER_PORT";
    port = Environment.GetEnvironmentVariable(envName)?.Trim();
    if (!string.IsNullOrWhiteSpace(port) && int.TryParse(port, out var parsedPort))
    {
        listenPort = parsedPort;
    }
}

app.Urls.Clear();
app.Urls.Add($"http://127.0.0.1:{listenPort}");

app.MapGet("/", () => Results.Ok(new
{
    ok = true,
    mode = isUserAgent ? "user-agent" : "service",
    endpoints = isUserAgent
        ? new[] { "/health", "/announce", "/announce-tts", "/test-beep", "/play-job" }
        : new[] { "/health", "/announce", "/announce-tts", "/test-beep", "/schedule-reservation", "/cancel-reservation", "/check-clips" }
}));
app.MapGet("/health", () => Results.Ok(new { ok = true }));

app.MapGet("/debug", () => Results.Ok(new
{
    ok = true,
    mode = isUserAgent ? "user-agent" : "service",
    isWindowsService = WindowsServiceHelpers.IsWindowsService(),
    processId = Environment.ProcessId,
    sessionId = Process.GetCurrentProcess().SessionId,
    helperUrlEnv = Environment.GetEnvironmentVariable("GATELING_ANNOUNCER_HELPER_URL")?.Trim(),
    useHelperEnv = Environment.GetEnvironmentVariable("GATELING_ANNOUNCER_USE_HELPER")?.Trim(),
    requireHelperEnv = Environment.GetEnvironmentVariable("GATELING_ANNOUNCER_REQUIRE_HELPER")?.Trim(),
    computed = new
    {
        effectiveHelperUrl =
            (Environment.GetEnvironmentVariable("GATELING_ANNOUNCER_HELPER_URL")?.Trim() is { Length: > 0 } u)
                ? u
                : "http://127.0.0.1:17778",
        useHelper = ComputeBoolDefaultServiceTrue("GATELING_ANNOUNCER_USE_HELPER"),
        requireHelper = ComputeBoolDefaultServiceTrue("GATELING_ANNOUNCER_REQUIRE_HELPER")
    }
}));

static bool ComputeBoolDefaultServiceTrue(string envVar)
{
    var isSvc = WindowsServiceHelpers.IsWindowsService();
    var value = Environment.GetEnvironmentVariable(envVar)?.Trim();
    if (string.IsNullOrWhiteSpace(value)) return isSvc;

    return value.Equals("1", StringComparison.OrdinalIgnoreCase)
        || value.Equals("true", StringComparison.OrdinalIgnoreCase)
        || value.Equals("yes", StringComparison.OrdinalIgnoreCase);
}

if (isUserAgent)
{
    app.MapPost("/play-job", async (AnnouncementJob job, Channel<AnnouncementJob> channel, HttpContext httpContext) =>
    {
        await channel.Writer.WriteAsync(job, httpContext.RequestAborted);
        return Results.Accepted(value: new { queued = true, type = "job" });
    });
}

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

if (!isUserAgent)
{
    app.MapPost("/check-clips", (CheckClipsPayload payload, AnnouncerPaths paths) =>
    {
        var keys = payload.Keys ?? new List<string>();
        var result = new Dictionary<string, bool>();
        foreach (var raw in keys)
        {
            var key = (raw ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(key)) continue;
            if (key.Any(ch => !(char.IsLetterOrDigit(ch) || ch == '-' || ch == '_'))) continue;
            var filePath = Path.Combine(paths.SoundsDir, $"{key}.mp3");
            result[key] = File.Exists(filePath);
        }
        return Results.Ok(result);
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
}

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

sealed record CheckClipsPayload(List<string>? Keys);

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
    private readonly HttpClient? _helperHttp;
    private readonly Uri? _helperBaseUri;
    private readonly bool _isWindowsService;
    private readonly bool _requireHelper;
    private readonly string _soundsDir;

    public AnnouncementWorker(Channel<AnnouncementJob> channel, ILogger<AnnouncementWorker> logger, AnnouncerPaths paths)
    {
        _channel = channel;
        _logger = logger;
        _soundsDir = paths.SoundsDir;
        Directory.CreateDirectory(_soundsDir);
        _isWindowsService = WindowsServiceHelpers.IsWindowsService();
        _http = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(45),
        };

        // When running as a Windows Service, per-session ducking typically cannot see the interactive user's sessions.
        // If a user-session helper is available, forward playback jobs to it.
        var useHelper = _isWindowsService;
        var useHelperEnv = Environment.GetEnvironmentVariable("GATELING_ANNOUNCER_USE_HELPER")?.Trim();
        if (!string.IsNullOrWhiteSpace(useHelperEnv))
        {
            useHelper = useHelperEnv.Equals("1", StringComparison.OrdinalIgnoreCase)
                || useHelperEnv.Equals("true", StringComparison.OrdinalIgnoreCase)
                || useHelperEnv.Equals("yes", StringComparison.OrdinalIgnoreCase);
        }

        _requireHelper = _isWindowsService;
        var requireHelperEnv = Environment.GetEnvironmentVariable("GATELING_ANNOUNCER_REQUIRE_HELPER")?.Trim();
        if (!string.IsNullOrWhiteSpace(requireHelperEnv))
        {
            _requireHelper = requireHelperEnv.Equals("1", StringComparison.OrdinalIgnoreCase)
                || requireHelperEnv.Equals("true", StringComparison.OrdinalIgnoreCase)
                || requireHelperEnv.Equals("yes", StringComparison.OrdinalIgnoreCase);
        }

        if (useHelper)
        {
            var helperUrl = Environment.GetEnvironmentVariable("GATELING_ANNOUNCER_HELPER_URL")?.Trim();
            if (string.IsNullOrWhiteSpace(helperUrl))
            {
                helperUrl = "http://127.0.0.1:17778";
            }

            if (Uri.TryCreate(helperUrl, UriKind.Absolute, out var parsed))
            {
                _helperBaseUri = parsed;
                _helperHttp = new HttpClient
                {
                    BaseAddress = parsed,
                    Timeout = TimeSpan.FromSeconds(4),
                };
            }
        }
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
        if (_helperHttp is not null && _helperBaseUri is not null)
        {
            if (await TryForwardToHelper(job, ct))
            {
                return;
            }

            if (_requireHelper)
            {
                _logger.LogError(
                    "Playback helper is required but unreachable. Refusing to play in Windows Service session. helper={Helper}",
                    _helperBaseUri);
                return;
            }
        }

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

        DuckingHandle? ducking = null;
        try
        {
            if (job.Duck)
            {
                _logger.LogInformation(
                    "Ducking enabled for job. processId={Pid} sessionId={SessionId}",
                    Environment.ProcessId,
                    Process.GetCurrentProcess().SessionId);
                ducking = DuckOtherAppSessionsAllRoles(effectiveDuckVolume, _logger);
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
        }
    }

    private async Task<bool> TryForwardToHelper(AnnouncementJob job, CancellationToken ct)
    {
        try
        {
            var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
            for (var attempt = 1; attempt <= 3; attempt++)
            {
                using var req = new HttpRequestMessage(HttpMethod.Post, "/play-job")
                {
                    Content = JsonContent.Create(job, options: options),
                };

                using var resp = await _helperHttp!.SendAsync(req, ct);
                if (resp.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Forwarded playback job to user-agent helper at {Helper} (attempt {Attempt})", _helperBaseUri, attempt);
                    return true;
                }

                _logger.LogWarning("User-agent helper returned {StatusCode} (attempt {Attempt})", (int)resp.StatusCode, attempt);
                await Task.Delay(TimeSpan.FromMilliseconds(250), ct);
            }

            _logger.LogWarning("Failed to forward job to helper after retries; falling back to local playback");
            return false;
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to forward job to user-agent helper; falling back to local playback");
            return false;
        }
    }

    private sealed class DuckingHandle : IDisposable
    {
        private readonly List<(AudioSessionControl session, float original)> _sessions;
        private readonly List<IDisposable> _disposables;
        private readonly ILogger _logger;
        private bool _disposed;

        public DuckingHandle(List<(AudioSessionControl session, float original)> sessions, List<IDisposable> disposables, ILogger logger)
        {
            _sessions = sessions;
            _disposables = disposables;
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

            for (var i = _disposables.Count - 1; i >= 0; i--)
            {
                try
                {
                    _disposables[i].Dispose();
                }
                catch
                {
                    // best-effort
                }
            }
        }
    }

    private static DuckingHandle DuckOtherAppSessionsAllRoles(float duckVolumeScalar, ILogger logger)
    {
        // Duck other apps by setting per-session volumes. We try multiple default roles because
        // some apps/devices are routed differently (Console/Multimedia/Communications).
        var currentPid = unchecked((uint)Environment.ProcessId);
        var ducked = new List<(AudioSessionControl session, float original)>();
        var disposables = new List<IDisposable>();
        var totalVisibleSessions = 0;
        var totalAttemptedSessions = 0;
        var deviceCount = 0;
        var duckedCount = 0;

        var processedDeviceIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenSessions = new HashSet<nint>();

        MMDeviceEnumerator? enumerator = null;
        try
        {
            enumerator = new MMDeviceEnumerator();
            disposables.Add(enumerator);

            var roles = new[] { Role.Console, Role.Multimedia, Role.Communications };
            foreach (var role in roles)
            {
                MMDevice? device = null;
                try
                {
                    device = enumerator.GetDefaultAudioEndpoint(DataFlow.Render, role);
                }
                catch
                {
                    continue;
                }

                if (device is null)
                {
                    continue;
                }

                if (!processedDeviceIds.Add(device.ID))
                {
                    device.Dispose();
                    continue;
                }

                deviceCount++;
                disposables.Add(device);

                AudioSessionManager? sessionManager = null;
                try
                {
                    sessionManager = device.AudioSessionManager;
                }
                catch
                {
                    continue;
                }

                // Let the compiler infer the correct NAudio session collection type.
                var sessionCollection = sessionManager.Sessions;
                totalVisibleSessions += sessionCollection.Count;

                for (var i = 0; i < sessionCollection.Count; i++)
                {
                    var session = sessionCollection[i];
                    totalAttemptedSessions++;

                    nint unk = 0;
                    try
                    {
                        unk = Marshal.GetIUnknownForObject(session);
                        if (unk != 0 && !seenSessions.Add(unk))
                        {
                            session.Dispose();
                            continue;
                        }
                    }
                    catch
                    {
                        // If we can't dedupe, proceed best-effort.
                    }

                    try
                    {
                        uint pid;
                        try
                        {
                            pid = session.GetProcessID;
                        }
                        catch
                        {
                            pid = 0;
                        }

                        // PID-less sessions are often "System Sounds"; ducking them can mute our own playback.
                        if (pid <= 0)
                        {
                            session.Dispose();
                            continue;
                        }

                        // Skip ourselves if we can identify it.
                        if (pid == currentPid)
                        {
                            session.Dispose();
                            continue;
                        }

                        var original = session.SimpleAudioVolume.Volume;
                        ducked.Add((session, original));
                        session.SimpleAudioVolume.Volume = duckVolumeScalar;
                        duckedCount++;
                    }
                    catch (Exception ex)
                    {
                        logger.LogDebug(ex, "Failed to duck an audio session");
                        session.Dispose();
                    }
                    finally
                    {
                        if (unk != 0)
                        {
                            try { Marshal.Release(unk); } catch { }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            // If session enumeration fails, do not block playback.
            logger.LogWarning(ex, "Session ducking failed; continuing without ducking");
        }

        if (duckedCount == 0)
        {
            logger.LogWarning(
                "No audio sessions were ducked (devices={DeviceCount} visibleSessions={VisibleSessions} attempted={Attempted}). "+
                "If this runs as a Windows Service, ensure the user-agent helper is running and reachable.",
                deviceCount,
                totalVisibleSessions,
                totalAttemptedSessions);
        }
        else
        {
            logger.LogInformation(
                "Ducked {DuckedCount} sessions across {DeviceCount} device(s) (duckVolumeScalar={DuckVolumeScalar})",
                duckedCount,
                deviceCount,
                duckVolumeScalar);
        }

        return new DuckingHandle(ducked, disposables, logger);
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
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        await LoadAsync(cancellationToken);
        await base.StartAsync(cancellationToken);
    }

    /// <summary>Shared naming convention — must match the server's sanitizeNameForFile.</summary>
    private static string SanitizeNameForFile(string name)
    {
        var sb = new StringBuilder();
        foreach (var ch in name.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(ch) || (ch >= '\u0600' && ch <= '\u06FF'))
                sb.Append(ch);
            else
                sb.Append('_');
        }

        // Collapse multiple underscores and trim leading/trailing.
        var result = System.Text.RegularExpressions.Regex.Replace(sb.ToString(), "_+", "_").Trim('_');
        return result;
    }

    public async Task UpsertAsync(ScheduledReservation reservation, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            var customerName = reservation.CustomerName;
            if (!string.IsNullOrWhiteSpace(customerName))
            {
                var safeName = SanitizeNameForFile(customerName);
                var enKey = $"{safeName}_en";
                var arKey = $"{safeName}_ar";
                var enFile = Path.Combine(_announcerPaths.SoundsDir, $"{enKey}.mp3");
                var arFile = Path.Combine(_announcerPaths.SoundsDir, $"{arKey}.mp3");

                if (File.Exists(enFile) && File.Exists(arFile))
                {
                    // Files already on disk — use them directly, no server call.
                    _logger.LogInformation("Disk cache hit for '{CustomerName}': {EnKey}, {ArKey}", customerName, enKey, arKey);
                    reservation = reservation with
                    {
                        Clips = new List<TtsClip>
                        {
                            new(Key: enKey, Base64: null, ContentType: "audio/mpeg"),
                            new(Key: arKey, Base64: null, ContentType: "audio/mpeg"),
                        }
                    };
                }
                else
                {
                    // Files missing — fetch from server.
                    var fetched = await FetchTTSFromServer(customerName, ct);
                    if (fetched.Count > 0)
                    {
                        await CacheClipsIfNeeded(fetched, ct);
                        reservation = reservation with { Clips = fetched };
                    }
                }
            }

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

    private async Task<List<TtsClip>> FetchTTSFromServer(string customerName, CancellationToken ct)
    {
        var endUrl = Environment.GetEnvironmentVariable("GATELING_ANNOUNCER_END_URL")?.Trim();
        var token = Environment.GetEnvironmentVariable("GATELING_ANNOUNCER_END_TOKEN")?.Trim();
        if (string.IsNullOrWhiteSpace(endUrl) || string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("Cannot fetch TTS: END_URL or END_TOKEN not set");
            return new List<TtsClip>();
        }

        // Derive generate-tts URL from end-reservation URL
        // e.g. https://cafe.gateling.com/api/local-announcer/end-reservation
        //   -> https://cafe.gateling.com/api/local-announcer/generate-tts
        var baseUrl = endUrl;
        var lastSlash = baseUrl.LastIndexOf('/');
        if (lastSlash > 0)
        {
            baseUrl = baseUrl[..lastSlash];
        }
        var ttsUrl = $"{baseUrl}/generate-tts";

        try
        {
            _logger.LogInformation("Fetching TTS for '{CustomerName}' from {Url}", customerName, ttsUrl);

            using var request = new HttpRequestMessage(HttpMethod.Post, ttsUrl);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            request.Content = new StringContent(
                JsonSerializer.Serialize(new { customerName }),
                Encoding.UTF8,
                "application/json");

            using var response = await _http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("TTS fetch failed: {Status}", (int)response.StatusCode);
                return new List<TtsClip>();
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            var doc = JsonDocument.Parse(json);
            var clipsArray = doc.RootElement.GetProperty("clips");

            var clips = new List<TtsClip>();
            foreach (var clipElement in clipsArray.EnumerateArray())
            {
                var key = clipElement.GetProperty("key").GetString() ?? string.Empty;
                var base64 = clipElement.GetProperty("base64").GetString() ?? string.Empty;
                var contentType = clipElement.TryGetProperty("contentType", out var ct2)
                    ? ct2.GetString() ?? "audio/mpeg"
                    : "audio/mpeg";
                clips.Add(new TtsClip(Key: key, Base64: base64, ContentType: contentType));
            }

            _logger.LogInformation("Fetched {Count} TTS clips for '{CustomerName}'", clips.Count, customerName);
            return clips;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch TTS for '{CustomerName}'", customerName);
            return new List<TtsClip>();
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
