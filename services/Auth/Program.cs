using Duende.IdentityServer;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Test;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
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

// Enable cookie authentication for interactive login (used by IdentityServer UI)
builder.Services
    .AddAuthentication(IdentityServerConstants.DefaultCookieAuthenticationScheme)
    .AddCookie(IdentityServerConstants.DefaultCookieAuthenticationScheme, o =>
    {
        o.LoginPath = "/account/login";
    });

builder.Services.AddIdentityServer()
    .AddInMemoryIdentityResources(new IdentityResource[]
    {
        new IdentityResources.OpenId(),
        new IdentityResources.Profile()
    })
    .AddInMemoryClients(new[]
    {
        new Client
        {
            ClientId = "bff-web",
            AllowedGrantTypes = GrantTypes.Code,
            RequirePkce = true,
            RequireClientSecret = false,
            RedirectUris = { "http://localhost:9080/auth/callback" },
            AllowedScopes = { "openid", "profile", "api1", "offline_access" },
            AllowOfflineAccess = true,
        },
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
            AllowedScopes = { "api1", "offline_access" },
            AllowOfflineAccess = true,
            AllowedCorsOrigins = { "http://localhost:3000" }
        },
        new Client
        {
            ClientId = "2",
            AllowedGrantTypes = GrantTypes.ResourceOwnerPassword,
            ClientSecrets = { new Secret("secret2".Sha256()) },
            AllowedScopes = { "api1", "offline_access" },
            AllowOfflineAccess = true,
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

app.UseAuthentication();
app.UseIdentityServer();

app.MapGet("/", () => "Auth Service running");

// Minimal login pages for demo purposes
app.MapGet("/account/login", (HttpContext ctx) =>
{
    var returnUrl = ctx.Request.Query["returnUrl"].ToString();
    if (string.IsNullOrEmpty(returnUrl)) returnUrl = "/";
    var html = $@"<!doctype html><html><head><meta charset='utf-8'><title>Login</title>
<style>body{font-family:sans-serif;padding:40px;}form{max-width:360px}label{display:block;margin:8px 0 4px}</style>
</head><body>
<h2>Auth Login</h2>
<form method='post' action='/account/login'>
  <input type='hidden' name='returnUrl' value='{System.Net.WebUtility.HtmlEncode(returnUrl)}'/>
  <label>Username</label><input name='username' value='user1'/>
  <label>Password</label><input type='password' name='password' value='pass1'/>
  <div style='margin-top:12px'><button type='submit'>Login</button></div>
  <p style='color:#666'>Demo user: user1 / pass1</p>
</form>
</body></html>";
    return Results.Content(html, "text/html");
});

app.MapPost("/account/login", async (HttpContext ctx) =>
{
    var form = await ctx.Request.ReadFormAsync();
    var username = form["username"].ToString();
    var password = form["password"].ToString();
    var returnUrl = form["returnUrl"].ToString();
    if (string.IsNullOrEmpty(returnUrl)) returnUrl = "/";

    var store = ctx.RequestServices.GetRequiredService<TestUserStore>();
    if (!store.ValidateCredentials(username, password))
    {
        return Results.Unauthorized();
    }
    var user = store.FindByUsername(username);
    var isUser = new Duende.IdentityServer.IdentityServerUser(user.SubjectId)
    {
        DisplayName = user.Username
    };
    await ctx.SignInAsync(IdentityServerConstants.DefaultCookieAuthenticationScheme, isUser.CreatePrincipal());
    return Results.Redirect(returnUrl);
});

app.MapPost("/account/logout", async (HttpContext ctx) =>
{
    await ctx.SignOutAsync(IdentityServerConstants.DefaultCookieAuthenticationScheme);
    return Results.Ok(new { ok = true });
});

app.Run();

public class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }
}

public partial class Program {}

