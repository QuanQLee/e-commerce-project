using Microsoft.EntityFrameworkCore;
using Shipping.Api.Infrastructure;
using MassTransit;
using Hangfire;
using Hangfire.PostgreSql;
using Shipping.Api.Jobs;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://0.0.0.0:80");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.EnableAnnotations();
    o.SwaggerDoc("v1", new() { Title = "Shipping API", Version = "v1" });
});

builder.Services.AddDbContext<ShippingDbContext>(options =>
{
    var cs = builder.Configuration.GetConnectionString("ShippingDb");
    options.UseNpgsql(cs);
});

builder.Services.AddHangfire(config =>
{
    config.UsePostgreSqlStorage(builder.Configuration.GetConnectionString("ShippingDb"));
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

RecurringJob.AddOrUpdate<CheckPendingShipmentsJob>(
    "check-pending",
    job => job.Run(),
    Cron.Minutely);

app.Run();
