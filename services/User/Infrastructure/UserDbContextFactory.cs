using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace User.Api.Infrastructure;

public class UserDbContextFactory : IDesignTimeDbContextFactory<UserDbContext>
{
    public UserDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<UserDbContext>();
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__UserDb")
            ?? "Host=localhost;Port=5432;Database=user;Username=user_svc;Password=changeme";

        optionsBuilder.UseNpgsql(connectionString);
        return new UserDbContext(optionsBuilder.Options);
    }
}
