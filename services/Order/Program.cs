using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Order.Api.Infrastructure;
using Microsoft.OpenApi.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
// Rebus and in-memory transport could not be restored in this environment
// using Rebus.Config;
// using Rebus.ServiceProvider;
// using Rebus.InMemory;
using Quartz;
using Serilog;
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

builder.WebHost.UseUrls("http://0.0.0.0:80");

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.EnableAnnotations();
    o.SwaggerDoc("v1", new() { Title = "Order API", Version = "v1" });
});

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddDbContext<OrderDbContext>(options =>
{
    var cs = builder.Configuration.GetConnectionString("OrderDb");
    options.UseNpgsql(cs);
});

// Rebus is skipped during this build
// builder.Services.AddRebus(configure =>
//     configure
//         .Transport(t => t.UseInMemoryTransport(new InMemNetwork(), "order")));

builder.Services.AddQuartz(q => { });
builder.Services.AddQuartzHostedService(options => options.WaitForJobsToComplete = true);
builder.Services.AddHealthChecks();

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseSwagger();
app.UseSwaggerUI();
app.MapControllers();
app.MapHealthChecks("/healthz");
app.UseHttpMetrics();

app.Run();
