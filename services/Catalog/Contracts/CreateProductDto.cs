namespace Catalog.Api.Contracts;

public record CreateProductDto(
    string Name,
    string Description,
    decimal Price,
    string? ImageUrl,
    string Category,
    int Stock);
