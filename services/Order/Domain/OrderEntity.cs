using System;
using System.Collections.Generic;
using System.Linq;

namespace Order.Api.Domain;

public enum OrderStatus
{
    PendingPayment,
    Paid,
    AwaitingShipment,
    Shipped,
    Completed,
    Cancelled
}

public class OrderEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public List<OrderItem> Items { get; private set; } = new();
    public decimal TotalPrice { get; private set; }
    public OrderStatus Status { get; private set; } = OrderStatus.PendingPayment;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public void AddItem(string productName, decimal price)
    {
        Items.Add(new OrderItem { OrderId = Id, ProductName = productName, Price = price });
        RecalculateTotal();
    }

    public void MarkCompleted() => Status = OrderStatus.Completed;

    private void RecalculateTotal() => TotalPrice = Items.Sum(i => i.Price);

    public void UpdateStatus(OrderStatus status)
    {
        Status = status;
    }
}
