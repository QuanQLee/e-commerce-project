using Microsoft.EntityFrameworkCore;
using User.Api.Domain;

namespace User.Api.Infrastructure;

public class UserDbContext(DbContextOptions<UserDbContext> options) : DbContext(options)
{
    public DbSet<UserEntity> Users => Set<UserEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("user");

        modelBuilder.Entity<UserEntity>(eb =>
        {
            eb.ToTable("users");
            eb.HasKey(u => u.Id);
            eb.Property(u => u.UserName).HasMaxLength(100);
            eb.Property(u => u.Email).HasMaxLength(200);
            eb.HasIndex(u => u.UserName).IsUnique();
            eb.HasIndex(u => u.Email).IsUnique();
        });
    }
}
