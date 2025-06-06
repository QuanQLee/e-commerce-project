using Catalog.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Infrastructure;

public class CatalogDbContext(DbContextOptions<CatalogDbContext> options)
        : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("catalog");

        modelBuilder.Entity<Product>(eb =>
        {
            eb.ToTable("products");
            eb.HasKey(p => p.Id);
            eb.Property(p => p.Name)
              .HasMaxLength(200)
              .IsRequired();
            eb.Property(p => p.Description)
              .HasMaxLength(1000);
            eb.Property(p => p.Price)
              .HasColumnType("numeric(12,2)");
        });
    }
}
