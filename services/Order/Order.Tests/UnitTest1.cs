using Order.Api.Domain;

namespace Order.Tests;

public class OrderEntityTests
{
    [Fact]
    public void AddItem_IncreasesTotalPrice()
    {
        var order = new OrderEntity();
        Assert.Equal(OrderStatus.PendingPayment, order.Status);
        order.AddItem("Product", 10m);
        order.AddItem("Another", 5m);
        Assert.Equal(15m, order.TotalPrice);
        Assert.Equal(2, order.Items.Count);
    }
}
