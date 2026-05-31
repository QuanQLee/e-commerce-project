using Microsoft.EntityFrameworkCore;
using Shipping.Api.Infrastructure;
using MassTransit;
using Hangfire;
//  校诖娲?
using Hangfire.MemoryStorage;                     // <-- 薷
// using Hangfire.PostgreSql;                    //  一锌删注
using Shipping.Api.Jobs;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);
var port = Environment.GetEnvironmentVariable("PORT") ?? "80";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddFilter("Microsoft.EntityFrameworkCore.Database.Command", LogLevel.Warning);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.EnableAnnotations();
    o.SwaggerDoc("v1", new() { Title = "Shipping API", Version = "v1" });
});

var shippingConnection = builder.Configuration.GetConnectionString("ShippingDb");
builder.Services.AddDbContext<ShippingDbContext>(options =>
{
    if (!string.IsNullOrWhiteSpace(shippingConnection))
    {
        options.UseNpgsql(shippingConnection, npgsql =>
            npgsql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(3), null));
    }
    else
    {
        options.UseInMemoryDatabase("ShippingTest");
    }
});

var healthChecks = builder.Services.AddHealthChecks();
if (!string.IsNullOrWhiteSpace(shippingConnection))
{
    healthChecks.AddNpgSql(shippingConnection, name: "database", tags: new[] { "ready" });
}

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService("shipping-service", serviceVersion: typeof(Program).Assembly.GetName().Version?.ToString())
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

//  Hangfire 也诖娲?
builder.Services.AddHangfire(config =>
{
    config.UseMemoryStorage();                    // <-- 薷
});
builder.Services.AddHangfireServer();

builder.Services.AddMassTransit(x =>
{
    x.UsingInMemory((context, cfg) => cfg.ConfigureEndpoints(context));
});

// schedule recurring job
builder.Services.AddScoped<CheckPendingShipmentsJob>();

var app = builder.Build();

if (!string.IsNullOrWhiteSpace(shippingConnection))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ShippingDbContext>();
    db.Database.ExecuteSqlRaw(
        """
        CREATE SCHEMA IF NOT EXISTS shipping;
        CREATE TABLE IF NOT EXISTS shipping.shipments (
            "Id" uuid PRIMARY KEY,
            "OrderId" varchar(50) NOT NULL,
            "Status" varchar(50) NOT NULL,
            "Carrier" varchar(50) NOT NULL,
            "ServiceLevel" varchar(30) NOT NULL,
            "ShippingFee" numeric(12,2) NOT NULL,
            "EstimatedDays" integer NOT NULL,
            "Currency" varchar(10) NOT NULL,
            "TrackingNumber" varchar(80) NOT NULL,
            "LabelUrl" varchar(300) NOT NULL,
            "LastTrackingUpdatedAt" timestamp with time zone NULL,
            "CreatedAt" timestamp with time zone NOT NULL
        );
        CREATE TABLE IF NOT EXISTS shipping.shipment_tracking_events (
            "Id" uuid PRIMARY KEY,
            "ShipmentId" uuid NOT NULL REFERENCES shipping.shipments("Id") ON DELETE CASCADE,
            "Status" varchar(50) NOT NULL,
            "Location" varchar(100) NOT NULL,
            "Description" varchar(300) NOT NULL,
            "EventTime" timestamp with time zone NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL
        );
        CREATE INDEX IF NOT EXISTS "IX_shipment_tracking_events_ShipmentId_EventTime"
            ON shipping.shipment_tracking_events ("ShipmentId", "EventTime");
        """);
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseRouting();
app.UseHangfireDashboard();
app.MapControllers();
app.MapHealthChecks("/healthz");
app.MapHealthChecks("/readyz", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

//  时粘
RecurringJob.AddOrUpdate<CheckPendingShipmentsJob>(
    "check-pending",
    job => job.Run(),
    Cron.Minutely);

app.Run();

