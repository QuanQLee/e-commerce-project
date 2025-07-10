namespace Catalog.Api.Domain;

using System;

public class Product
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = default!;
    public string Description { get; private set; } = default!;
    public decimal Price { get; private set; }
    public string? ImageUrl { get; private set; }
    public string Category { get; private set; } = default!;
    public int Stock { get; private set; }

    public void Update(string name, string desc, decimal price, string? imageUrl, string category, int stock)
    {
        Name = name;
        Description = desc;
        Price = price;
        ImageUrl = imageUrl;
        Category = category;
        Stock = stock;
    }

    // Backwards compatible overload used in tests
    public void Update(string name, string desc, decimal price)
        => Update(name, desc, price, null, "", 0);
}

