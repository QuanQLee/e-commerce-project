using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Catalog.Api.Infrastructure; // 你的 DbContext 所在命名空间
using System;
using System.Threading.Tasks;
using System.Collections.Immutable;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Hosting;
using Swashbuckle.AspNetCore.Annotations;
using Microsoft.Extensions.Configuration;

// 其他 using ...


var builder = WebApplication.CreateBuilder(args);

// Apply pending EF Core migrations automatically
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
    db.Database.Migrate();
}

// 强制监听 0.0.0.0:80 端口，适配 Docker
builder.WebHost.UseUrls("http://0.0.0.0:80");

// ...以下保持不变
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.EnableAnnotations();
    o.SwaggerDoc("v1", new() { Title = "Catalog API", Version = "v1" });
});

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
builder.Services.AddDbContext<CatalogDbContext>(options =>
{
    var cs = builder.Configuration.GetConnectionString("CatalogDb");
    options.UseNpgsql(cs);
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.MapControllers();

app.Run();
