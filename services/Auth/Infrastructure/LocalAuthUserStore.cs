using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Auth.Infrastructure;

public sealed class DuplicateLocalAuthUserException : Exception
{
    public DuplicateLocalAuthUserException(string username)
        : base($"A local auth user named '{username}' already exists.")
    {
    }
}

public sealed class LocalAuthUserStore
{
    private readonly AuthDbContext _dbContext;
    private readonly ILocalAuthPasswordService _passwordService;
    private readonly ILogger<LocalAuthUserStore> _logger;

    public LocalAuthUserStore(
        AuthDbContext dbContext,
        ILocalAuthPasswordService passwordService,
        ILogger<LocalAuthUserStore> logger)
    {
        _dbContext = dbContext;
        _passwordService = passwordService;
        _logger = logger;
    }

    public Task<LocalAuthUser?> FindByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        var normalizedUserName = Normalize(username);
        if (string.IsNullOrWhiteSpace(normalizedUserName))
        {
            return Task.FromResult<LocalAuthUser?>(null);
        }

        return _dbContext.LocalUsers.SingleOrDefaultAsync(
            user => user.NormalizedUserName == normalizedUserName,
            cancellationToken);
    }

    public Task<LocalAuthUser?> FindBySubjectIdAsync(string subjectId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(subjectId))
        {
            return Task.FromResult<LocalAuthUser?>(null);
        }

        return _dbContext.LocalUsers.SingleOrDefaultAsync(
            user => user.SubjectId == subjectId.Trim(),
            cancellationToken);
    }

    public async Task<LocalAuthUser?> ValidateCredentialsAsync(
        string username,
        string password,
        CancellationToken cancellationToken = default)
    {
        var user = await FindByUsernameAsync(username, cancellationToken);
        if (user is null || !user.IsActive)
        {
            return null;
        }

        var verification = _passwordService.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return null;
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _passwordService.HashPassword(user, password);
            user.UpdatedUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Rehashed password for auth user {Username}.", user.Username);
        }

        return user;
    }

    public async Task<LocalAuthUser> CreateUserAsync(
        string username,
        string password,
        string? displayName = null,
        string? email = null,
        CancellationToken cancellationToken = default)
    {
        var trimmedUsername = username.Trim();
        var normalizedUserName = Normalize(trimmedUsername);
        var normalizedEmail = Normalize(email);

        if (await _dbContext.LocalUsers.AnyAsync(user => user.NormalizedUserName == normalizedUserName, cancellationToken))
        {
            throw new DuplicateLocalAuthUserException(trimmedUsername);
        }

        var now = DateTime.UtcNow;
        var user = new LocalAuthUser
        {
            SubjectId = Guid.NewGuid().ToString("N"),
            Username = trimmedUsername,
            NormalizedUserName = normalizedUserName,
            Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim(),
            NormalizedEmail = normalizedEmail,
            DisplayName = string.IsNullOrWhiteSpace(displayName) ? trimmedUsername : displayName.Trim(),
            CreatedUtc = now,
            UpdatedUtc = now,
            IsActive = true,
        };
        user.PasswordHash = _passwordService.HashPassword(user, password);

        _dbContext.LocalUsers.Add(user);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
        {
            _logger.LogWarning(exception, "Duplicate auth user create attempt for {Username}.", trimmedUsername);
            throw new DuplicateLocalAuthUserException(trimmedUsername);
        }

        return user;
    }

    public async Task EnsureBootstrapUserAsync(
        string username,
        string password,
        CancellationToken cancellationToken = default)
    {
        var existing = await FindByUsernameAsync(username, cancellationToken);
        if (existing is not null)
        {
            return;
        }

        await CreateUserAsync(
            username,
            password,
            username,
            $"{username}@example.com",
            cancellationToken);

        _logger.LogWarning("Seeded bootstrap auth user {Username}. Disable this outside development.", username);
    }

    public static string Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToUpperInvariant();
    }
}
