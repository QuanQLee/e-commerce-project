using System.ComponentModel.DataAnnotations;

namespace Auth.Configuration;

public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    [Required]
    [Url]
    public string BffRedirectUri { get; init; } = "http://localhost:9080/auth/callback";

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

    [Required]
    [MinLength(4)]
    public string DefaultTestUserPassword { get; init; } = "pass1";

    public string? SigningCertificatePath { get; init; }

    public string? SigningCertificatePassword { get; init; }

    public bool UsesDefaultSecrets() =>
        SampleClientSecret == "secret" ||
        AdminClientSecret == "secret1" ||
        SecondaryAdminClientSecret == "secret2" ||
        DefaultTestUserPassword == "pass1";
}
