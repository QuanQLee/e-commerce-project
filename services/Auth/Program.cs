using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using Auth.Configuration;
using Duende.IdentityServer;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Test;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options =>
{
    options.IncludeScopes = true;
    options.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffK";
});

builder.Services.AddOptions<AuthOptions>()
    .Bind(builder.Configuration.GetSection(AuthOptions.SectionName))
    .ValidateDataAnnotations()
    .Validate(options => options.ApiScopes.Length > 0, "Auth:ApiScopes must contain at least one entry.")
    .Validate(options => options.AllowedCorsOrigins.Length > 0, "Auth:AllowedCorsOrigins must contain at least one entry.")
    .ValidateOnStart();

var authOptions = builder.Configuration.GetSection(AuthOptions.SectionName).Get<AuthOptions>() ?? new AuthOptions();

if (!builder.Environment.IsDevelopment() && authOptions.UsesDefaultSecrets())
{
    throw new InvalidOperationException("Auth client secrets must be overridden before running in production.");
}

var connectionString = builder.Configuration.GetConnectionString("AuthDb");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("ConnectionStrings:AuthDb is not configured.");
}

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddDbContext<AuthDbContext>(options =>
{
    options.UseNpgsql(connectionString, o => o.MigrationsHistoryTable("__EFMigrationsHistory", "auth"));
});

builder.Services.AddHealthChecks()
    .AddNpgSql(connectionString, name: "database", tags: new[] { "ready" });

builder.Services.AddCors(options =>
{
    options.AddPolicy("default", policy =>
    {
        policy.WithOrigins(authOptions.AllowedCorsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddHttpLogging(logging =>
{
    logging.LoggingFields = HttpLoggingFields.RequestPropertiesAndHeaders |
                             HttpLoggingFields.ResponsePropertiesAndHeaders;
    logging.RequestBodyLogLimit = 0;
    logging.ResponseBodyLogLimit = 0;
});

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService("auth-service", serviceVersion: typeof(Program).Assembly.GetName().Version?.ToString())
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

var normalizedScopes = authOptions.ApiScopes
    .Where(scope => !string.IsNullOrWhiteSpace(scope))
    .Select(scope => scope.Trim())
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

if (normalizedScopes.Length == 0)
{
    throw new InvalidOperationException("Auth:ApiScopes must contain at least one non-empty value.");
}

var offlineScopes = normalizedScopes
    .Concat(new[] { "offline_access" })
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToList();
var identityServerBuilder = builder.Services.AddIdentityServer()
    .AddInMemoryIdentityResources(new IdentityResource[]
    {
        new IdentityResources.OpenId(),
        new IdentityResources.Profile()
    })
    .AddInMemoryApiScopes(normalizedScopes.Select(scope => new ApiScope(scope, scope)))
    .AddInMemoryClients(new[]
    {
        new Client
        {
            ClientId = "bff-web",
            AllowedGrantTypes = GrantTypes.Code,
            RequirePkce = true,
            RequireClientSecret = false,
            RedirectUris = { authOptions.BffRedirectUri },
            AllowedCorsOrigins = authOptions.AllowedCorsOrigins,
            AllowOfflineAccess = true,
            AllowedScopes = authOptions.ApiScopes
                .Concat(new[] { "openid", "profile", "offline_access" })
                .Distinct()
                .ToList()
        },
        new Client
        {
            ClientId = "sample",
            AllowedGrantTypes = GrantTypes.ClientCredentials,
            ClientSecrets = { new Secret(authOptions.SampleClientSecret.Sha256()) },
            AllowedScopes = authOptions.ApiScopes.ToList()
        },
        new Client
        {
            ClientId = "1",
            AllowedGrantTypes = GrantTypes.ResourceOwnerPassword,
            ClientSecrets = { new Secret(authOptions.AdminClientSecret.Sha256()) },
            AllowedScopes = offlineScopes,
            AllowOfflineAccess = true,
            AllowedCorsOrigins = authOptions.AllowedCorsOrigins
        },
        new Client
        {
            ClientId = "2",
            AllowedGrantTypes = GrantTypes.ResourceOwnerPassword,
            ClientSecrets = { new Secret(authOptions.SecondaryAdminClientSecret.Sha256()) },
            AllowedScopes = offlineScopes,
            AllowOfflineAccess = true,
            AllowedCorsOrigins = authOptions.AllowedCorsOrigins
        }
    })
    .AddTestUsers(new List<TestUser>
    {
        new TestUser
        {
            SubjectId = "1001",
            Username = "user1",
            Password = authOptions.DefaultTestUserPassword
        }
    });

if (!string.IsNullOrWhiteSpace(authOptions.SigningCertificatePath))
{
    X509Certificate2 certificate;
    if (string.IsNullOrWhiteSpace(authOptions.SigningCertificatePassword))
    {
        certificate = X509Certificate2.CreateFromPemFile(authOptions.SigningCertificatePath);
    }
    else
    {
        certificate = new X509Certificate2(authOptions.SigningCertificatePath, authOptions.SigningCertificatePassword);
    }
    identityServerBuilder.AddSigningCredential(certificate);
}
else if (builder.Environment.IsDevelopment())
{
    identityServerBuilder.AddDeveloperSigningCredential();
}
else
{
    throw new InvalidOperationException("Auth:SigningCertificatePath must be configured for non-development environments.");
}

var app = builder.Build();

app.UseHttpLogging();
app.UseCors("default");
app.UseAuthentication();
app.UseIdentityServer();

app.MapGet("/", () => Results.Json(new { status = "ok", service = "auth" }));

app.MapHealthChecks("/healthz");
app.MapHealthChecks("/readyz", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.MapGet("/account/login", (HttpContext ctx) =>
{
    var returnUrl = ctx.Request.Query["returnUrl"].ToString();
    if (string.IsNullOrEmpty(returnUrl))
    {
        returnUrl = "/";
    }

    var html = $@"<!doctype html><html><head><meta charset='utf-8'><title>Login</title>
<style>body{{font-family:sans-serif;padding:40px;}}form{{max-width:360px}}label{{display:block;margin:8px 0 4px}}</style>
</head><body>
<h2>Auth Login</h2>
<form method='post' action='/account/login'>
  <input type='hidden' name='returnUrl' value='{System.Net.WebUtility.HtmlEncode(returnUrl)}'/>
  <label>Username</label><input name='username' autocomplete='username'/>
  <label>Password</label><input type='password' name='password' autocomplete='current-password'/>
  <div style='margin-top:12px'><button type='submit'>Login</button></div>
  <p style='color:#666'>Demo user: user1 / {authOptions.DefaultTestUserPassword}</p>
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
    if (string.IsNullOrEmpty(returnUrl))
    {
        returnUrl = "/";
    }

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

app.MapPost("/account/register", (RegisterRequest request, TestUserStore store) =>
{
    var username = request.Username?.Trim();
    var password = request.Password;
    if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
    {
        return Results.BadRequest(new { message = "Username and password are required." });
    }

    lock (store)
    {
        if (store.FindByUsername(username) != null)
        {
            return Results.Conflict(new { message = "Username already exists." });
        }

        store.CreateUser(username, password, username, $"{username}@example.com");
    }

    return Results.Ok(new { ok = true });
});

app.MapPost("/account/logout", async (HttpContext ctx) =>
{
    await ctx.SignOutAsync(IdentityServerConstants.DefaultCookieAuthenticationScheme);
    return Results.Ok(new { ok = true });
});

app.Run();

public class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options)
    {
    }
}

public partial class Program
{
}

public record RegisterRequest(string Username, string Password);
