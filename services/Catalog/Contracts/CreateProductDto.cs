namespace Catalog.Api.Contracts;

public record CreateProductDto(
    string Name,
    string Description,
    decimal Price,
    string? ImageUrl = null,
    string Category = "",
    int Stock = 0);
