using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Auth.Infrastructure;

public sealed class AuthDbContextFactory : IDesignTimeDbContextFactory<AuthDbContext>
{
    public AuthDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AuthDbContext>();
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__AuthDb")
            ?? "Host=localhost;Port=5432;Database=auth;Username=auth_svc;Password=changeme";

        optionsBuilder.UseNpgsql(connectionString, options =>
            options.MigrationsHistoryTable("__EFMigrationsHistory", "auth"));

        return new AuthDbContext(optionsBuilder.Options);
    }
}
