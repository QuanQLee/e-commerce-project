using Shipping.Api.Domain;

namespace Shipping.Tests;

public class ShipmentTests
{
    [Fact]
    public void NewShipment_HasDefaults()
    {
        var shipment = new Shipment { OrderId = "1" };
        Assert.Equal("Created", shipment.Status);
        Assert.True(shipment.CreatedAt <= DateTime.UtcNow);
    }
}

