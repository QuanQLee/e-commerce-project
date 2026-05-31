using Microsoft.EntityFrameworkCore;

namespace Auth.Infrastructure;

public sealed class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options)
    {
    }

    public DbSet<LocalAuthUser> LocalUsers => Set<LocalAuthUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema("auth");

        modelBuilder.Entity<LocalAuthUser>(entity =>
        {
            entity.ToTable("local_users");

            entity.HasKey(user => user.Id);
            entity.Property(user => user.SubjectId).HasMaxLength(64).IsRequired();
            entity.Property(user => user.Username).HasMaxLength(100).IsRequired();
            entity.Property(user => user.NormalizedUserName).HasMaxLength(100).IsRequired();
            entity.Property(user => user.Email).HasMaxLength(320);
            entity.Property(user => user.NormalizedEmail).HasMaxLength(320);
            entity.Property(user => user.DisplayName).HasMaxLength(200).IsRequired();
            entity.Property(user => user.PasswordHash).HasMaxLength(512).IsRequired();
            entity.Property(user => user.CreatedUtc).IsRequired();
            entity.Property(user => user.UpdatedUtc).IsRequired();

            entity.HasIndex(user => user.SubjectId).IsUnique();
            entity.HasIndex(user => user.NormalizedUserName).IsUnique();
            entity.HasIndex(user => user.NormalizedEmail).IsUnique();
        });
    }
}
