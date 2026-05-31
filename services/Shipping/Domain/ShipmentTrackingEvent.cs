using System;

namespace Shipping.Api.Domain;

public class ShipmentTrackingEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ShipmentId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime EventTime { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Shipment? Shipment { get; set; }
}
