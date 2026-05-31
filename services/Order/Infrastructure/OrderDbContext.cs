using Microsoft.EntityFrameworkCore;
using Order.Api.Domain;

namespace Order.Api.Infrastructure;

public class OrderDbContext(DbContextOptions<OrderDbContext> options) : DbContext(options)
{
    public DbSet<OrderEntity> Orders => Set<OrderEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("order");

        modelBuilder.Entity<OrderEntity>(eb =>
        {
            eb.ToTable("orders");
            eb.HasKey(o => o.Id);
            eb.Property(o => o.TenantId).HasMaxLength(80).HasDefaultValue("public").IsRequired();
            eb.Property(o => o.UserId).IsRequired();
            eb.Property(o => o.Status).HasConversion<string>().HasMaxLength(50);
            eb.Property(o => o.CreatedAt);
            eb.Property(o => o.TotalPrice).HasColumnType("numeric(12,2)");
            eb.HasIndex(o => new { o.TenantId, o.CreatedAt });
            eb.HasIndex(o => new { o.TenantId, o.UserId, o.CreatedAt });
        });

        modelBuilder.Entity<OrderItem>(eb =>
        {
            eb.ToTable("order_items");
            eb.HasKey(i => i.Id);
            eb.Property(i => i.TenantId).HasMaxLength(80).HasDefaultValue("public").IsRequired();
            eb.Property(i => i.ProductName).HasMaxLength(200);
            eb.Property(i => i.Price).HasColumnType("numeric(12,2)");
            eb.HasIndex(i => new { i.TenantId, i.OrderId });
            eb.HasOne(i => i.Order)
              .WithMany(o => o.Items)
              .HasForeignKey(i => i.OrderId);
        });
    }
}

