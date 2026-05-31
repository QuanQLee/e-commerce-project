namespace Catalog.Api.Domain;

using System;

public class ProductSku
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string TenantId { get; private set; } = "public";
    public Guid ProductId { get; private set; }
    public string Code { get; private set; } = default!;
    public decimal Price { get; private set; }
    public int Stock { get; private set; }
    public string AttributesJson { get; private set; } = "{}";
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; private set; } = DateTime.UtcNow;

    public static ProductSku Create(
        string tenantId,
        Guid productId,
        string code,
        decimal price,
        int stock,
        string attributesJson)
    {
        return new ProductSku
        {
            TenantId = string.IsNullOrWhiteSpace(tenantId) ? "public" : tenantId.Trim(),
            ProductId = productId,
            Code = code,
            Price = price,
            Stock = stock,
            AttributesJson = attributesJson,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow,
        };
    }

    public void SetStatus(bool isActive)
    {
        IsActive = isActive;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Update(string code, decimal price, int stock, string attributesJson)
    {
        Code = code;
        Price = price;
        Stock = stock;
        AttributesJson = attributesJson;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
