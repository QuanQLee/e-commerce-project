using Microsoft.EntityFrameworkCore;
using Shipping.Api.Infrastructure;
using MassTransit;
using Hangfire;
//  校诖娲?
using Hangfire.MemoryStorage;                     // <-- 薷
// using Hangfire.PostgreSql;                    //  一锌删注
using Shipping.Api.Jobs;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://0.0.0.0:80");
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.EnableAnnotations();
    o.SwaggerDoc("v1", new() { Title = "Shipping API", Version = "v1" });
});

//  某 In-Memory DB
builder.Services.AddDbContext<ShippingDbContext>(options =>
{
    options.UseInMemoryDatabase("ShippingTest");  // <-- 薷
});

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

app.UseSwagger();
app.UseSwaggerUI();
app.UseRouting();
app.UseHangfireDashboard();
app.MapControllers();

//  时粘
RecurringJob.AddOrUpdate<CheckPendingShipmentsJob>(
    "check-pending",
    job => job.Run(),
    Cron.Minutely);

app.Run();

