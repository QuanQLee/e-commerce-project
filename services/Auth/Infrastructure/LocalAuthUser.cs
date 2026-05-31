using System;

namespace Auth.Infrastructure;

public sealed class LocalAuthUser
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string SubjectId { get; set; } = Guid.NewGuid().ToString("N");

    public string Username { get; set; } = string.Empty;

    public string NormalizedUserName { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? NormalizedEmail { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
}
