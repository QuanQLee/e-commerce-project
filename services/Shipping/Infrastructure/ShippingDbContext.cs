using Microsoft.EntityFrameworkCore;
using Shipping.Api.Domain;

namespace Shipping.Api.Infrastructure;

public class ShippingDbContext(DbContextOptions<ShippingDbContext> options) : DbContext(options)
{
    public DbSet<Shipment> Shipments => Set<Shipment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("shipping");
        modelBuilder.Entity<Shipment>(eb =>
        {
            eb.ToTable("shipments");
            eb.HasKey(s => s.Id);
            eb.Property(s => s.OrderId).HasMaxLength(50);
            eb.Property(s => s.Status).HasMaxLength(50);
        });
    }
}

