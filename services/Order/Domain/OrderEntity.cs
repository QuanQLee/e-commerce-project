using System;
using System.Collections.Generic;
using System.Linq;

namespace Order.Api.Domain;

public class OrderEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public List<OrderItem> Items { get; private set; } = new();
    public decimal TotalPrice { get; private set; }
    public string Status { get; private set; } = "Pending";

    public void AddItem(string productName, decimal price)
    {
        Items.Add(new OrderItem { OrderId = Id, ProductName = productName, Price = price });
        RecalculateTotal();
    }

    public void MarkCompleted() => Status = "Completed";

    private void RecalculateTotal() => TotalPrice = Items.Sum(i => i.Price);
}
