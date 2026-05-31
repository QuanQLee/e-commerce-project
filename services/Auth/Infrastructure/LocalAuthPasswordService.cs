using Microsoft.AspNetCore.Identity;

namespace Auth.Infrastructure;

public interface ILocalAuthPasswordService
{
    string HashPassword(LocalAuthUser user, string password);

    PasswordVerificationResult VerifyHashedPassword(LocalAuthUser user, string passwordHash, string password);
}

public sealed class LocalAuthPasswordService : ILocalAuthPasswordService
{
    private readonly PasswordHasher<LocalAuthUser> _passwordHasher = new();

    public string HashPassword(LocalAuthUser user, string password)
    {
        return _passwordHasher.HashPassword(user, password);
    }

    public PasswordVerificationResult VerifyHashedPassword(LocalAuthUser user, string passwordHash, string password)
    {
        return _passwordHasher.VerifyHashedPassword(user, passwordHash, password);
    }
}
