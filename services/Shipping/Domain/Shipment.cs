using System;
using System.Collections.Generic;

namespace Shipping.Api.Domain;

public class Shipment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = string.Empty;
    public string Status { get; set; } = "Created";
    public string Carrier { get; set; } = string.Empty;
    public string ServiceLevel { get; set; } = "standard";
    public decimal ShippingFee { get; set; }
    public int EstimatedDays { get; set; }
    public string Currency { get; set; } = "CNY";
    public string TrackingNumber { get; set; } = string.Empty;
    public string LabelUrl { get; set; } = string.Empty;
    public DateTime? LastTrackingUpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<ShipmentTrackingEvent> Events { get; set; } = new();
}
