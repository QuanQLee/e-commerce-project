using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Cart.Api.Infrastructure;
using Prometheus;
using Serilog;
using Microsoft.AspNetCore.Hosting;
using System;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT") ?? "80";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

static int GetConfigInt(IConfiguration configuration, string key, int defaultValue)
{
    var value = configuration[key];
    return int.TryParse(value, out var parsed) && parsed > 0 ? parsed : defaultValue;
}

builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new() { Title = "Cart API", Version = "v1" });
});

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
});

builder.Services.AddSingleton<ICartStore, RedisCartStore>();
var inventoryUrl = builder.Configuration["INVENTORY_URL"] ?? "http://inventory.api:8000";
var inventoryTimeoutSeconds = GetConfigInt(builder.Configuration, "CART_INVENTORY_TIMEOUT_SECONDS", 5);
var inventoryMaxConnections = GetConfigInt(builder.Configuration, "CART_INVENTORY_MAX_CONNECTIONS", 512);
var inventoryIdleTimeoutSeconds = GetConfigInt(builder.Configuration, "CART_INVENTORY_IDLE_TIMEOUT_SECONDS", 2);
var inventoryConnectionLifetimeSeconds = GetConfigInt(builder.Configuration, "CART_INVENTORY_CONNECTION_LIFETIME_SECONDS", 120);
builder.Services
    .AddHttpClient("inventory", client =>
    {
        client.BaseAddress = new Uri(inventoryUrl);
        client.Timeout = TimeSpan.FromSeconds(inventoryTimeoutSeconds);
    })
    .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
    {
        MaxConnectionsPerServer = inventoryMaxConnections,
        PooledConnectionIdleTimeout = TimeSpan.FromSeconds(inventoryIdleTimeoutSeconds),
        PooledConnectionLifetime = TimeSpan.FromSeconds(inventoryConnectionLifetimeSeconds),
        AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate,
    });

builder.Services.AddHealthChecks().AddRedis(
    builder.Configuration.GetConnectionString("Redis") ?? "cart.redis:6379",
    name: "redis",
    tags: new[] { "ready" });

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService("cart-service", serviceVersion: typeof(Program).Assembly.GetName().Version?.ToString())
        .AddAttributes(new[]
        {
            new KeyValuePair<string, object>("deployment.environment", builder.Environment.EnvironmentName)
        }))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter())
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()
        .AddOtlpExporter());

var app = builder.Build();

if (builder.Configuration.GetValue<bool>("ENABLE_HTTP_LOGGING"))
{
    app.UseSerilogRequestLogging();
}

if (builder.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("ENABLE_SWAGGER"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();
app.MapHealthChecks("/healthz");
app.MapHealthChecks("/readyz", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
app.UseHttpMetrics();

app.Run();

