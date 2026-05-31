using Shipping.Api.Domain;

namespace Shipping.Tests;

public class ShipmentTests
{
    [Fact]
    public void NewShipment_HasDefaults()
    {
        var shipment = new Shipment { OrderId = "1" };
        Assert.Equal("Created", shipment.Status);
        Assert.Equal("standard", shipment.ServiceLevel);
        Assert.Equal("CNY", shipment.Currency);
        Assert.True(shipment.CreatedAt <= DateTime.UtcNow);
    }

    [Fact]
    public void TrackingEvent_CanBeCreated()
    {
        var shipmentId = Guid.NewGuid();
        var evt = new ShipmentTrackingEvent
        {
            ShipmentId = shipmentId,
            Status = "InTransit",
            Location = "Shanghai",
            Description = "Departed sorting center",
            EventTime = DateTime.UtcNow,
        };

        Assert.Equal(shipmentId, evt.ShipmentId);
        Assert.Equal("InTransit", evt.Status);
    }
}
