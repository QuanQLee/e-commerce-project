using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;
using Auth.Configuration;
using Auth.Infrastructure;
using Duende.IdentityServer;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Services;
using Duende.IdentityServer.Validation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

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
var useInMemoryDb = builder.Environment.IsEnvironment("Testing") ||
                    builder.Configuration.GetValue<bool>("UseInMemoryDb") ||
                    string.Equals(
                        Environment.GetEnvironmentVariable("USE_INMEMORY_DB"),
                        "true",
                        StringComparison.OrdinalIgnoreCase);

ValidateRuntimeOptions(builder.Environment, authOptions, useInMemoryDb);

var connectionString = builder.Configuration.GetConnectionString("AuthDb");
if (!useInMemoryDb && string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("ConnectionStrings:AuthDb is not configured.");
}

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddDbContext<AuthDbContext>(options =>
{
    if (useInMemoryDb)
    {
        options.UseInMemoryDatabase("AuthLocal");
        return;
    }

    options.UseNpgsql(connectionString, o => o.MigrationsHistoryTable("__EFMigrationsHistory", "auth"));
});

var healthChecks = builder.Services.AddHealthChecks();
if (!useInMemoryDb && !string.IsNullOrWhiteSpace(connectionString))
{
    healthChecks.AddNpgSql(connectionString, name: "database", tags: new[] { "ready" });
}

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

builder.Services.AddScoped<ILocalAuthPasswordService, LocalAuthPasswordService>();
builder.Services.AddScoped<LocalAuthUserStore>();
builder.Services.AddScoped<IProfileService, LocalAuthProfileService>();
builder.Services.AddScoped<IResourceOwnerPasswordValidator, LocalResourceOwnerPasswordValidator>();

var normalizedScopes = authOptions.ApiScopes
    .Where(scope => !string.IsNullOrWhiteSpace(scope))
    .Select(scope => scope.Trim())
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

if (normalizedScopes.Length == 0)
{
    throw new InvalidOperationException("Auth:ApiScopes must contain at least one non-empty value.");
}

var identityServerBuilder = builder.Services.AddIdentityServer()
    .AddInMemoryIdentityResources(new IdentityResource[]
    {
        new IdentityResources.OpenId(),
        new IdentityResources.Profile()
    })
    .AddInMemoryApiScopes(normalizedScopes.Select(scope => new ApiScope(scope, scope)))
    .AddInMemoryClients(BuildClients(authOptions, normalizedScopes))
    .AddProfileService<LocalAuthProfileService>()
    .AddResourceOwnerValidator<LocalResourceOwnerPasswordValidator>();

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
else if (builder.Environment.IsDevelopment() || useInMemoryDb)
{
    identityServerBuilder.AddDeveloperSigningCredential();
}
else
{
    throw new InvalidOperationException(
        "Auth signing certificate is required outside development. " +
        "Configure Auth:SigningCertificatePath and Auth:SigningCertificatePassword.");
}

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    if (useInMemoryDb)
    {
        dbContext.Database.EnsureCreated();
    }
    else
    {
        dbContext.Database.Migrate();
    }

    if (authOptions.EnableBootstrapTestUser)
    {
        var userStore = scope.ServiceProvider.GetRequiredService<LocalAuthUserStore>();
        await userStore.EnsureBootstrapUserAsync(authOptions.BootstrapTestUsername, authOptions.DefaultTestUserPassword);
    }
}

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
    var error = ctx.Request.Query["error"].ToString();
    return Results.Content(
        BuildLoginPage(
            string.IsNullOrWhiteSpace(returnUrl) ? "/" : returnUrl,
            string.IsNullOrWhiteSpace(error) ? null : error,
            authOptions),
        "text/html");
});

app.MapPost("/account/login", async (HttpContext ctx, LocalAuthUserStore userStore) =>
{
    var form = await ctx.Request.ReadFormAsync();
    var username = form["username"].ToString();
    var password = form["password"].ToString();
    var returnUrl = form["returnUrl"].ToString();
    if (string.IsNullOrWhiteSpace(returnUrl))
    {
        returnUrl = "/";
    }

    var user = await userStore.ValidateCredentialsAsync(username, password, ctx.RequestAborted);
    if (user is null)
    {
        return Results.Redirect(BuildLoginUrl(returnUrl, "Invalid username or password."));
    }

    var isUser = CreateIdentityServerUser(user);
    await ctx.SignInAsync(IdentityServerConstants.DefaultCookieAuthenticationScheme, isUser.CreatePrincipal());
    return Results.Redirect(returnUrl);
});

app.MapPost("/account/register", async (RegisterRequest request, LocalAuthUserStore userStore, HttpContext ctx) =>
{
    if (!authOptions.EnableSelfRegistration)
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var username = request.Username?.Trim();
    var password = request.Password;
    var usernameError = ValidateUsername(username);
    if (usernameError is not null)
    {
        return Results.BadRequest(new { message = usernameError });
    }

    var passwordError = ValidatePassword(password, authOptions.LocalPasswordMinLength);
    if (passwordError is not null)
    {
        return Results.BadRequest(new { message = passwordError });
    }

    try
    {
        var user = await userStore.CreateUserAsync(
            username!,
            password!,
            username,
            $"{username}@example.com",
            ctx.RequestAborted);

        return Results.Ok(new { ok = true, subjectId = user.SubjectId });
    }
    catch (DuplicateLocalAuthUserException)
    {
        return Results.Conflict(new { message = "Username already exists." });
    }
});

app.MapPost("/account/logout", async (HttpContext ctx) =>
{
    await ctx.SignOutAsync(IdentityServerConstants.DefaultCookieAuthenticationScheme);
    return Results.Ok(new { ok = true });
});

app.Run();

static IReadOnlyCollection<Client> BuildClients(AuthOptions authOptions, string[] normalizedScopes)
{
    var offlineScopes = normalizedScopes
        .Concat(new[] { "offline_access" })
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToList();

    var clients = new List<Client>
    {
        new()
        {
            ClientId = "bff-web",
            AllowedGrantTypes = GrantTypes.Code,
            RequirePkce = true,
            RequireClientSecret = false,
            RedirectUris = { authOptions.BffRedirectUri },
            AllowedCorsOrigins = authOptions.AllowedCorsOrigins,
            AllowOfflineAccess = true,
            AllowedScopes = normalizedScopes
                .Concat(new[] { "openid", "profile", "offline_access" })
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList()
        },
        new()
        {
            ClientId = authOptions.MobileClientId,
            AllowedGrantTypes = GrantTypes.Code,
            RequirePkce = true,
            RequireClientSecret = false,
            RedirectUris = authOptions.MobileRedirectUris.ToList(),
            AllowOfflineAccess = true,
            AllowedScopes = normalizedScopes
                .Concat(new[] { "openid", "profile", "offline_access" })
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList()
        },
        new()
        {
            ClientId = "sample",
            AllowedGrantTypes = GrantTypes.ClientCredentials,
            ClientSecrets = { new Secret(authOptions.SampleClientSecret.Sha256()) },
            AllowedScopes = normalizedScopes.ToList()
        }
    };

    if (authOptions.EnablePasswordGrantClients)
    {
        clients.AddRange(new[]
        {
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
        });
    }

    return clients;
}

static void ValidateRuntimeOptions(IHostEnvironment environment, AuthOptions authOptions, bool useInMemoryDb)
{
    if (useInMemoryDb && !environment.IsDevelopment() && !environment.IsEnvironment("Testing"))
    {
        throw new InvalidOperationException(
            "In-memory auth storage is only allowed in development or testing environments.");
    }

    if (useInMemoryDb)
    {
        return;
    }

    if (!environment.IsDevelopment() && authOptions.UsesDefaultSecrets())
    {
        throw new InvalidOperationException(
            "Auth service is using development secrets. Override client secrets and bootstrap password before startup.");
    }

    if (!environment.IsDevelopment() && authOptions.EnableBootstrapTestUser)
    {
        throw new InvalidOperationException(
            "Auth:EnableBootstrapTestUser must be false outside development.");
    }

    if (!environment.IsDevelopment() && authOptions.EnablePasswordGrantClients)
    {
        throw new InvalidOperationException(
            "Auth:EnablePasswordGrantClients must be false outside development. Use authorization code + PKCE instead.");
    }
}

static string? ValidateUsername(string? username)
{
    if (string.IsNullOrWhiteSpace(username))
    {
        return "Username is required.";
    }

    if (username.Length < 3)
    {
        return "Username must be at least 3 characters.";
    }

    if (username.Any(char.IsWhiteSpace))
    {
        return "Username cannot contain whitespace.";
    }

    if (username.Any(ch => !(char.IsLetterOrDigit(ch) || ch is '.' or '_' or '-' or '@')))
    {
        return "Username contains unsupported characters.";
    }

    return null;
}

static string? ValidatePassword(string? password, int minimumLength)
{
    if (string.IsNullOrWhiteSpace(password))
    {
        return "Password is required.";
    }

    if (password.Length < minimumLength)
    {
        return $"Password must be at least {minimumLength} characters.";
    }

    if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit))
    {
        return "Password must contain both letters and digits.";
    }

    return null;
}

static string BuildLoginUrl(string returnUrl, string? error = null)
{
    var encodedReturnUrl = WebUtility.UrlEncode(string.IsNullOrWhiteSpace(returnUrl) ? "/" : returnUrl);
    var loginUrl = $"/account/login?returnUrl={encodedReturnUrl}";
    if (!string.IsNullOrWhiteSpace(error))
    {
        loginUrl += $"&error={WebUtility.UrlEncode(error)}";
    }

    return loginUrl;
}

static string BuildLoginPage(string returnUrl, string? error, AuthOptions authOptions)
{
    var bootstrapHint = authOptions.EnableBootstrapTestUser
        ? $"<p style='color:#666'>Bootstrap dev user: {WebUtility.HtmlEncode(authOptions.BootstrapTestUsername)} / {WebUtility.HtmlEncode(authOptions.DefaultTestUserPassword)}</p>"
        : string.Empty;
    var errorBlock = string.IsNullOrWhiteSpace(error)
        ? string.Empty
        : $"<div style='margin:12px 0;padding:12px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c'>{WebUtility.HtmlEncode(error)}</div>";

    return $@"<!doctype html><html><head><meta charset='utf-8'><title>Login</title>
<style>
body{{font-family:sans-serif;padding:40px;background:#f8fafc;color:#0f172a;}}
form{{max-width:360px;background:white;padding:24px;border-radius:16px;box-shadow:0 12px 32px rgba(15,23,42,.08)}}
label{{display:block;margin:8px 0 4px;font-weight:600}}
input{{width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;box-sizing:border-box}}
button{{margin-top:16px;padding:10px 14px;border:0;border-radius:10px;background:#0f172a;color:white;cursor:pointer}}
</style>
</head><body>
<h2>Auth Login</h2>
<form method='post' action='/account/login'>
  <input type='hidden' name='returnUrl' value='{WebUtility.HtmlEncode(returnUrl)}'/>
  <label>Username</label><input name='username' autocomplete='username'/>
  <label>Password</label><input type='password' name='password' autocomplete='current-password'/>
  {errorBlock}
  <div><button type='submit'>Login</button></div>
  {bootstrapHint}
</form>
</body></html>";
}

static Duende.IdentityServer.IdentityServerUser CreateIdentityServerUser(LocalAuthUser user)
{
    return new Duende.IdentityServer.IdentityServerUser(user.SubjectId)
    {
        DisplayName = string.IsNullOrWhiteSpace(user.DisplayName) ? user.Username : user.DisplayName,
        AdditionalClaims = LocalAuthClaims.CreateAdditionalClaims(user).ToList()
    };
}

public partial class Program
{
}

public record RegisterRequest(string Username, string Password);
