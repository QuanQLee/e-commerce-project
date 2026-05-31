using Order.Api.Domain;

namespace Order.Tests;

public class OrderEntityTests
{
    [Fact]
    public void AddItem_IncreasesTotalPrice()
    {
        var order = new OrderEntity();
        Assert.Equal(OrderStatus.PendingPayment, order.Status);
        Assert.Equal("public", order.TenantId);
        order.AddItem("Product", 10m);
        order.AddItem("Another", 5m);
        Assert.Equal(15m, order.TotalPrice);
        Assert.Equal(2, order.Items.Count);
        Assert.All(order.Items, item => Assert.Equal("public", item.TenantId));
    }

    [Fact]
    public void AssignTenant_UpdatesOrderAndFutureItems()
    {
        var order = new OrderEntity();

        order.AssignTenant("tenant-a");
        order.AddItem("Product", 10m);

        Assert.Equal("tenant-a", order.TenantId);
        Assert.Single(order.Items);
        Assert.Equal("tenant-a", order.Items[0].TenantId);
    }
}

