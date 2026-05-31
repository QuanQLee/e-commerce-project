using System.ComponentModel.DataAnnotations;

namespace Auth.Configuration;

public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    [Required]
    [MinLength(1)]
    public string BootstrapTestUsername { get; init; } = "user1";

    [Required]
    [Url]
    public string BffRedirectUri { get; init; } = "http://localhost:8000/auth/callback";

    [Required]
    [MinLength(1)]
    public string[] MobileRedirectUris { get; init; } = new[]
    {
        "dsmobile://auth/callback"
    };

    [Required]
    [MinLength(1)]
    public string MobileClientId { get; init; } = "mobile-native";

    [Required]
    [MinLength(1)]
    public string[] AllowedCorsOrigins { get; init; } = new[]
    {
        "http://localhost:3000",
        "http://localhost:5173"
    };

    [Required]
    [MinLength(1)]
    public string[] ApiScopes { get; init; } = new[] { "api1" };

    [Required]
    [MinLength(8)]
    public string SampleClientSecret { get; init; } = "secret";

    [Required]
    [MinLength(8)]
    public string AdminClientSecret { get; init; } = "secret1";

    [Required]
    [MinLength(8)]
    public string SecondaryAdminClientSecret { get; init; } = "secret2";

    [MinLength(8)]
    public string DefaultTestUserPassword { get; init; } = "DevPassw0rd!";

    [Range(8, 128)]
    public int LocalPasswordMinLength { get; init; } = 12;

    public bool EnablePasswordGrantClients { get; init; }

    public bool EnableSelfRegistration { get; init; }

    public bool EnableBootstrapTestUser { get; init; }

    public string? SigningCertificatePath { get; init; }

    public string? SigningCertificatePassword { get; init; }

    public bool UsesDefaultSecrets() =>
        SampleClientSecret == "secret" ||
        AdminClientSecret == "secret1" ||
        SecondaryAdminClientSecret == "secret2" ||
        (EnableBootstrapTestUser && DefaultTestUserPassword == "DevPassw0rd!");
}
