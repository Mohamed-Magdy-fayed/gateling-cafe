using System.Net;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.AspNetCore.Http.Json;
using NAudio.CoreAudioApi;
using NAudio.Wave;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddSingleton(_ =>
    Channel.CreateUnbounded<AnnouncementJob>(new UnboundedChannelOptions
    {
        SingleReader = true,
        SingleWriter = false,
    }));

builder.Services.AddHostedService<AnnouncementWorker>();

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

app.MapPost("/test-beep", async (TestBeepPayload payload, Channel<AnnouncementJob> channel) =>
{
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

    await channel.Writer.WriteAsync(job);
    return Results.Accepted(value: new { queued = true, type = "beep", frequencyHz, durationMs });
});

app.Run();

sealed record AnnouncerPaths(string SoundsDir);

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
        var currentPid = Environment.ProcessId;
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
                    int pid;
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
