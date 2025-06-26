using System;
using System.Text.Json.Serialization;

namespace Order.Api.Domain;

public class OrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public string ProductName { get; set; } = default!;
    public decimal Price { get; set; }
    [JsonIgnore]
    public OrderEntity? Order { get; set; }
}
