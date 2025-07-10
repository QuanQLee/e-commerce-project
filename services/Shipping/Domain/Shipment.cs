using System;

namespace Shipping.Api.Domain;

public class Shipment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = string.Empty;
    public string Status { get; set; } = "Created";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

