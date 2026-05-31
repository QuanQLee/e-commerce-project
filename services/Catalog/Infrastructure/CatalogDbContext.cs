using Catalog.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Infrastructure;

public class CatalogDbContext(DbContextOptions<CatalogDbContext> options)
        : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductSku> ProductSkus => Set<ProductSku>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("catalog");

        modelBuilder.Entity<Product>(eb =>
        {
            eb.ToTable("products");
            eb.HasKey(p => p.Id);
            eb.Property(p => p.TenantId)
              .HasMaxLength(80)
              .HasDefaultValue("public")
              .IsRequired();
            eb.Property(p => p.Name)
              .HasMaxLength(200)
              .IsRequired();
            eb.Property(p => p.Description)
              .HasMaxLength(1000);
              eb.Property(p => p.Price)
                .HasColumnType("numeric(12,2)");
            eb.Property(p => p.ImageUrl)
                .HasMaxLength(500);
            eb.Property(p => p.Category)
                .HasMaxLength(200)
                .IsRequired();
            eb.Property(p => p.Stock);
            eb.HasIndex(p => p.TenantId);
            eb.HasIndex(p => p.Name);
            eb.HasIndex(p => p.Category);
        });

        modelBuilder.Entity<ProductSku>(eb =>
        {
            eb.ToTable("product_skus");
            eb.HasKey(s => s.Id);
            eb.Property(s => s.TenantId)
              .HasMaxLength(80)
              .HasDefaultValue("public")
              .IsRequired();
            eb.Property(s => s.ProductId).IsRequired();
            eb.Property(s => s.Code)
              .HasMaxLength(120)
              .IsRequired();
            eb.Property(s => s.Price)
              .HasColumnType("numeric(12,2)");
            eb.Property(s => s.Stock);
            eb.Property(s => s.AttributesJson)
              .HasColumnType("jsonb")
              .HasDefaultValueSql("'{}'::jsonb")
              .IsRequired();
            eb.Property(s => s.IsActive).HasDefaultValue(true);
            eb.Property(s => s.CreatedAtUtc).HasColumnType("timestamp with time zone");
            eb.Property(s => s.UpdatedAtUtc).HasColumnType("timestamp with time zone");
            eb.HasIndex(s => s.TenantId);
            eb.HasIndex(s => s.ProductId);
            eb.HasIndex(s => new { s.TenantId, s.ProductId, s.Code }).IsUnique();
            eb.HasOne<Product>()
              .WithMany()
              .HasForeignKey(s => s.ProductId)
              .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

