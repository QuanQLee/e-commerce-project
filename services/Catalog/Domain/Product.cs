namespace Catalog.Api.Domain;
using System;
// ÆäËû using ...

public class Product
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = default!;
    public string Description { get; private set; } = default!;
    public decimal Price { get; private set; }

    public void Update(string name, string desc, decimal price)
    {
        Name = name;
        Description = desc;
        Price = price;
    }
}
