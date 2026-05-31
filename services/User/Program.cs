using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using User.Api.Infrastructure;
using Microsoft.OpenApi.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Quartz;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.AddFilter("Microsoft.EntityFrameworkCore.Database.Command", LogLevel.Warning);

var port = Environment.GetEnvironmentVariable("PORT") ?? "80";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
var useInMemoryDb = !(Environment.GetEnvironmentVariable("USE_INMEMORY_DB") ?? "true")
    .Equals("false", StringComparison.OrdinalIgnoreCase);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.EnableAnnotations();
    o.SwaggerDoc("v1", new() { Title = "User API", Version = "v1" });
});

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddDbContext<UserDbContext>(options =>
{
    options.ConfigureWarnings(warnings =>
        warnings.Ignore(RelationalEventId.PendingModelChangesWarning));

    if (useInMemoryDb)
    {
        options.UseInMemoryDatabase("UserTest");
        return;
    }

    var cs = builder.Configuration.GetConnectionString("UserDb");
    options.UseNpgsql(cs, npgsqlOptions =>
        npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "user"));
});

var healthChecks = builder.Services.AddHealthChecks();
var enableReadyDbCheck = !useInMemoryDb;
if (enableReadyDbCheck)
{
    healthChecks.AddNpgSql(builder.Configuration.GetConnectionString("UserDb") ?? string.Empty,
        name: "database",
        tags: new[] { "ready" });
}

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService("user-service", serviceVersion: typeof(Program).Assembly.GetName().Version?.ToString())
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

// Rebus is skipped during this build
// builder.Services.AddRebus(configure =>
//     configure
//         .Transport(t => t.UseInMemoryTransport(new InMemNetwork(), "user")));

builder.Services.AddQuartz(q => { });
builder.Services.AddQuartzHostedService(options => options.WaitForJobsToComplete = true);

var app = builder.Build();

// Ensure the user schema exists at startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<UserDbContext>();
    if (useInMemoryDb)
    {
        db.Database.EnsureCreated();
    }
    else
    {
        db.Database.Migrate();
    }
}

app.UseSwagger();
app.UseSwaggerUI();
app.MapControllers();
app.MapHealthChecks("/healthz");
app.MapHealthChecks("/readyz", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.Run();

