using Microsoft.EntityFrameworkCore;
using Shipping.Api.Infrastructure;
using MassTransit;
using Hangfire;
// ★ 新增行：引入内存存储包
using Hangfire.MemoryStorage;                     // <-- 修改
// using Hangfire.PostgreSql;                    // ← 这一行可以删掉或注释
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

// Ensure database exists
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ShippingDbContext>();
    db.Database.EnsureCreated();
}

// ★ 改成 In-Memory DB
builder.Services.AddDbContext<ShippingDbContext>(options =>
{
    options.UseInMemoryDatabase("ShippingTest");  // <-- 修改
});

// ★ Hangfire 也换成内存存储
builder.Services.AddHangfire(config =>
{
    config.UseMemoryStorage();                    // <-- 修改
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

// ★ 定时任务照常可用
RecurringJob.AddOrUpdate<CheckPendingShipmentsJob>(
    "check-pending",
    job => job.Run(),
    Cron.Minutely);

app.Run();
