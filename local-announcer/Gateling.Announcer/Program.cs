using System.Net;
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

app.MapGet("/health", () => Results.Ok(new { ok = true }));

app.MapPost("/announce", async (AnnouncementPayload payload, Channel<AnnouncementJob> channel) =>
{
    if (payload.Urls is null || payload.Urls.Count == 0)
    {
        return Results.BadRequest(new { error = "urls is required" });
    }

    var urls = payload.Urls
        .Select(u => u?.Trim())
        .Where(u => !string.IsNullOrWhiteSpace(u))
        .ToList();

    if (urls.Count == 0)
    {
        return Results.BadRequest(new { error = "urls is required" });
    }

    var job = new AnnouncementJob(
        Urls: urls,
        Duck: payload.Duck ?? true,
        DuckVolumeScalar: payload.DuckVolumeScalar,
        RequestedAtUtc: DateTimeOffset.UtcNow);

    await channel.Writer.WriteAsync(job);
    return Results.Accepted(value: new { queued = true, count = urls.Count });
});

app.Run();

sealed record AnnouncementPayload(
    List<string> Urls,
    bool? Duck,
    float? DuckVolumeScalar);

sealed record AnnouncementJob(
    List<string> Urls,
    bool Duck,
    float? DuckVolumeScalar,
    DateTimeOffset RequestedAtUtc);

sealed class AnnouncementWorker : BackgroundService
{
    private readonly Channel<AnnouncementJob> _channel;
    private readonly ILogger<AnnouncementWorker> _logger;
    private readonly HttpClient _http;

    public AnnouncementWorker(Channel<AnnouncementJob> channel, ILogger<AnnouncementWorker> logger)
    {
        _channel = channel;
        _logger = logger;
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

        float? originalVolume = null;
        MMDevice? device = null;
        try
        {
            if (job.Duck)
            {
                device = new MMDeviceEnumerator().GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia);
                originalVolume = device.AudioEndpointVolume.MasterVolumeLevelScalar;
                device.AudioEndpointVolume.MasterVolumeLevelScalar = effectiveDuckVolume;
            }

            foreach (var url in job.Urls)
            {
                ct.ThrowIfCancellationRequested();
                await PlayUrl(url, ct);
            }
        }
        finally
        {
            try
            {
                if (job.Duck && device is not null && originalVolume.HasValue)
                {
                    device.AudioEndpointVolume.MasterVolumeLevelScalar = originalVolume.Value;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to restore master volume");
            }
            finally
            {
                device?.Dispose();
            }
        }
    }

    private async Task PlayUrl(string url, CancellationToken ct)
    {
        _logger.LogInformation("Playing {Url}", url);

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

        var tempFile = Path.Combine(Path.GetTempPath(), $"gateling-announcement-{Guid.NewGuid():N}.mp3");
        try
        {
            await File.WriteAllBytesAsync(tempFile, audioBytes, ct);
            await PlayFile(tempFile, ct);
        }
        finally
        {
            try
            {
                if (File.Exists(tempFile))
                {
                    File.Delete(tempFile);
                }
            }
            catch
            {
                // best-effort cleanup
            }
        }
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
