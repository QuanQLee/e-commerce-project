using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Auth.Tests;

public class RootEndpointTests
{
    [Fact]
    public async Task Root_ReturnsServiceMessage()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();

        var resp = await client.GetAsync("/");

        resp.EnsureSuccessStatusCode();
        var text = await resp.Content.ReadAsStringAsync();
        Assert.Equal("{\"status\":\"ok\",\"service\":\"auth\"}", text);
    }

    [Fact]
    public async Task Register_CreatesLocalUser_WhenRegistrationEnabled()
    {
        using var factory = CreateFactory(new Dictionary<string, string?>
        {
            ["Auth:EnableSelfRegistration"] = "true",
            ["Auth:LocalPasswordMinLength"] = "8",
        });
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
        });

        var registerResponse = await client.PostAsJsonAsync("/account/register", new
        {
            username = "merchant.admin",
            password = "ProdPass123"
        });

        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        var loginResponse = await client.PostAsync("/account/login", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["username"] = "merchant.admin",
            ["password"] = "ProdPass123",
            ["returnUrl"] = "/"
        }));

        Assert.Equal(HttpStatusCode.Redirect, loginResponse.StatusCode);
        Assert.Equal("/", loginResponse.Headers.Location?.ToString());
    }

    [Fact]
    public async Task Register_ReturnsForbidden_WhenRegistrationDisabled()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/account/register", new
        {
            username = "merchant.admin",
            password = "ProdPass123"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task LoginPage_HidesBootstrapHint_WhenBootstrapUserDisabled()
    {
        using var factory = CreateFactory(new Dictionary<string, string?>
        {
            ["Auth:EnableBootstrapTestUser"] = "false",
        });
        using var client = factory.CreateClient();

        var html = await client.GetStringAsync("/account/login");

        Assert.DoesNotContain("Bootstrap dev user", html);
    }

    [Fact]
    public async Task LoginPage_ShowsBootstrapHint_WhenBootstrapUserEnabled()
    {
        using var factory = CreateFactory(new Dictionary<string, string?>
        {
            ["Auth:EnableBootstrapTestUser"] = "true",
            ["Auth:BootstrapTestUsername"] = "user1",
            ["Auth:DefaultTestUserPassword"] = "StrongPass123",
        });
        using var client = factory.CreateClient();

        var html = await client.GetStringAsync("/account/login");

        Assert.Contains("Bootstrap dev user: user1 / StrongPass123", html);
    }

    [Fact]
    public void ProductionStartup_RejectsDefaultSecrets()
    {
        using var factory = CreateFactory(
            environment: Environments.Production,
            overrides: new Dictionary<string, string?>
            {
                ["UseInMemoryDb"] = "false",
                ["ConnectionStrings:AuthDb"] = "Host=localhost;Port=5432;Database=auth;Username=auth_svc;Password=changeme",
                ["Auth:SampleClientSecret"] = "secret",
                ["Auth:AdminClientSecret"] = "secret1",
                ["Auth:SecondaryAdminClientSecret"] = "secret2",
                ["Auth:DefaultTestUserPassword"] = "DevPassw0rd!",
                ["Auth:EnablePasswordGrantClients"] = "false",
                ["Auth:EnableBootstrapTestUser"] = "false",
            });

        var exception = Assert.ThrowsAny<Exception>(() => factory.CreateClient());

        Assert.Contains("development secrets", exception.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ProductionStartup_RequiresSigningCertificate()
    {
        using var factory = CreateFactory(
            environment: Environments.Production,
            overrides: new Dictionary<string, string?>
            {
                ["UseInMemoryDb"] = "false",
                ["ConnectionStrings:AuthDb"] = "Host=localhost;Port=5432;Database=auth;Username=auth_svc;Password=changeme",
                ["Auth:SampleClientSecret"] = "ProdSecret123!",
                ["Auth:AdminClientSecret"] = "ProdSecret456!",
                ["Auth:SecondaryAdminClientSecret"] = "ProdSecret789!",
                ["Auth:DefaultTestUserPassword"] = "ProdPass123!",
                ["Auth:EnablePasswordGrantClients"] = "false",
                ["Auth:EnableBootstrapTestUser"] = "false",
            });

        var exception = Assert.ThrowsAny<Exception>(() => factory.CreateClient());

        Assert.Contains("signing certificate is required", exception.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ProductionStartup_RejectsInMemoryStorage()
    {
        using var factory = CreateFactory(
            environment: Environments.Production,
            overrides: new Dictionary<string, string?>
            {
                ["UseInMemoryDb"] = "true",
            });

        var exception = Assert.ThrowsAny<Exception>(() => factory.CreateClient());

        Assert.Contains("in-memory auth storage is only allowed", exception.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private static TestAuthWebApplicationFactory CreateFactory(
        IDictionary<string, string?>? overrides = null,
        string environment = "Testing")
    {
        var settings = new Dictionary<string, string?>
        {
            ["UseInMemoryDb"] = "true",
            ["Auth:EnablePasswordGrantClients"] = "false",
            ["Auth:EnableSelfRegistration"] = "false",
            ["Auth:EnableBootstrapTestUser"] = "false",
            ["Auth:DefaultTestUserPassword"] = "StrongPass123",
            ["Auth:LocalPasswordMinLength"] = "8",
        };

        if (overrides is not null)
        {
            foreach (var pair in overrides)
            {
                settings[pair.Key] = pair.Value;
            }
        }

        return new TestAuthWebApplicationFactory(environment, settings);
    }
}

internal sealed class TestAuthWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _environment;
    private readonly IDictionary<string, string?> _settings;
    private readonly Dictionary<string, string?> _originalValues = new();

    public TestAuthWebApplicationFactory(string environment, IDictionary<string, string?> settings)
    {
        _environment = environment;
        _settings = settings;

        foreach (var pair in _settings)
        {
            var envName = ToEnvironmentVariableName(pair.Key);
            _originalValues[envName] = Environment.GetEnvironmentVariable(envName);
            Environment.SetEnvironmentVariable(envName, pair.Value);
        }
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(_environment);
    }

    protected override void Dispose(bool disposing)
    {
        foreach (var pair in _originalValues)
        {
            Environment.SetEnvironmentVariable(pair.Key, pair.Value);
        }

        base.Dispose(disposing);
    }

    private static string ToEnvironmentVariableName(string key)
    {
        return key switch
        {
            "UseInMemoryDb" => "USE_INMEMORY_DB",
            _ => key.Replace(":", "__", StringComparison.Ordinal),
        };
    }
}
