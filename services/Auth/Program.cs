using Duende.IdentityServer;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Test;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using System;
using System.Collections.Generic;

var builder = WebApplication.CreateBuilder(args);

// Allow the listening port to be overridden via the PORT environment variable
// so the container can adapt to different hosting environments. Default is 80.
var port = Environment.GetEnvironmentVariable("PORT") ?? "80";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddDbContext<AuthDbContext>(options =>
{
    var cs = builder.Configuration.GetConnectionString("AuthDb");
    options.UseNpgsql(cs, o => o.MigrationsHistoryTable("__EFMigrationsHistory", "auth"));
});

builder.Services.AddIdentityServer()
    .AddInMemoryClients(new[]
    {
        new Client
        {
            ClientId = "sample",
            AllowedGrantTypes = GrantTypes.ClientCredentials,
            ClientSecrets = { new Secret("secret".Sha256()) },
            AllowedScopes = { "api1" },
            AllowedCorsOrigins = { "http://localhost:3000" }
        },
        new Client
        {
            ClientId = "1",
            AllowedGrantTypes = GrantTypes.ResourceOwnerPassword,
            ClientSecrets = { new Secret("secret1".Sha256()) },
            AllowedScopes = { "api1" },
            AllowedCorsOrigins = { "http://localhost:3000" }
        },
        new Client
        {
            ClientId = "2",
            AllowedGrantTypes = GrantTypes.ResourceOwnerPassword,
            ClientSecrets = { new Secret("secret2".Sha256()) },
            AllowedScopes = { "api1" },
            AllowedCorsOrigins = { "http://localhost:3000" }
        }
    })
    .AddInMemoryApiScopes(new[] { new ApiScope("api1", "API") })
    .AddTestUsers(new List<TestUser>
    {
        new TestUser
        {
            SubjectId = "1001",
            Username = "user1",
            Password = "pass1"
        }
    })
    .AddDeveloperSigningCredential();

var app = builder.Build();

app.UseIdentityServer();

app.MapGet("/", () => "Auth Service running");

app.Run();

public class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }
}
