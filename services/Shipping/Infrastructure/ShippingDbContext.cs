using Microsoft.EntityFrameworkCore;
using Shipping.Api.Domain;

namespace Shipping.Api.Infrastructure;

public class ShippingDbContext(DbContextOptions<ShippingDbContext> options) : DbContext(options)
{
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<ShipmentTrackingEvent> ShipmentTrackingEvents => Set<ShipmentTrackingEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("shipping");

        modelBuilder.Entity<Shipment>(eb =>
        {
            eb.ToTable("shipments");
            eb.HasKey(s => s.Id);
            eb.Property(s => s.OrderId).HasMaxLength(50);
            eb.Property(s => s.Status).HasMaxLength(50);
            eb.Property(s => s.Carrier).HasMaxLength(50);
            eb.Property(s => s.ServiceLevel).HasMaxLength(30);
            eb.Property(s => s.Currency).HasMaxLength(10);
            eb.Property(s => s.TrackingNumber).HasMaxLength(80);
            eb.Property(s => s.LabelUrl).HasMaxLength(300);
            eb.Property(s => s.ShippingFee).HasColumnType("numeric(12,2)");
            eb.HasMany(s => s.Events)
                .WithOne(e => e.Shipment)
                .HasForeignKey(e => e.ShipmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ShipmentTrackingEvent>(eb =>
        {
            eb.ToTable("shipment_tracking_events");
            eb.HasKey(e => e.Id);
            eb.Property(e => e.Status).HasMaxLength(50);
            eb.Property(e => e.Location).HasMaxLength(100);
            eb.Property(e => e.Description).HasMaxLength(300);
            eb.HasIndex(e => new { e.ShipmentId, e.EventTime });
        });
    }
}
