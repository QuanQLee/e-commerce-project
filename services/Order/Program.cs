using System;
using System.Collections.Generic;
using Order.Configuration;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Order.Api.Infrastructure;
using Quartz;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options =>
{
    options.IncludeScopes = true;
    options.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffK";
});
builder.Logging.AddFilter("Microsoft.EntityFrameworkCore.Database.Command", LogLevel.Warning);

var enableHttpLogging = (Environment.GetEnvironmentVariable("ENABLE_HTTP_LOGGING") ?? "false")
    .Equals("true", StringComparison.OrdinalIgnoreCase);

if (enableHttpLogging)
{
    builder.Services.AddHttpLogging(logging =>
    {
        logging.LoggingFields = HttpLoggingFields.RequestPropertiesAndHeaders |
                                 HttpLoggingFields.ResponsePropertiesAndHeaders;
        logging.RequestBodyLogLimit = 0;
        logging.ResponseBodyLogLimit = 0;
    });
}

builder.Services.AddOptions<OrderOptions>()
    .Bind(builder.Configuration.GetSection(OrderOptions.SectionName))
    .ValidateDataAnnotations()
    .Validate(options => options.AllowedCorsOrigins.Length > 0, "Order:AllowedCorsOrigins must not be empty.")
    .ValidateOnStart();

var orderOptions = builder.Configuration.GetSection(OrderOptions.SectionName).Get<OrderOptions>() ?? new OrderOptions();

if (!builder.Environment.IsDevelopment() && orderOptions.UsesDefaultOrigins())
{
    throw new InvalidOperationException("Order:AllowedCorsOrigins must be overridden for non-development environments.");
}

var connectionString = builder.Configuration.GetConnectionString("OrderDb");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("ConnectionStrings:OrderDb must be configured.");
}

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.EnableAnnotations();
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Order API", Version = "v1" });
});

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddDbContext<OrderDbContext>(options => options.UseNpgsql(
    connectionString,
    npgsqlOptions =>
    {
        npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "order");
        npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
    }
));

builder.Services.AddCors(options =>
{
    options.AddPolicy("default", policy =>
    {
        policy.WithOrigins(orderOptions.AllowedCorsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddQuartz(q => { });
builder.Services.AddQuartzHostedService(options => options.WaitForJobsToComplete = true);

builder.Services.AddHealthChecks()
    .AddNpgSql(connectionString, name: "database", tags: new[] { "ready" });

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService("order-service", serviceVersion: typeof(Program).Assembly.GetName().Version?.ToString())
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

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<OrderDbContext>();
    db.Database.Migrate();
}

if (builder.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (enableHttpLogging)
{
    app.UseHttpLogging();
}
app.UseRouting();
app.UseCors("default");
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/healthz");
app.MapHealthChecks("/readyz", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.Run();
