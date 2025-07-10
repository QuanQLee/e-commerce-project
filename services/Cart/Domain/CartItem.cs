using System;

namespace Cart.Api.Domain;

public class CartItem
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
}

