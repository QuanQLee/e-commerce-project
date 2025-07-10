using Catalog.Api.Contracts;
using Catalog.Api.Controllers;
using Catalog.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Tests;

public class ProductsControllerTests
{
    [Fact]
    public async Task Create_AddsProduct()
    {
        var options = new DbContextOptionsBuilder<CatalogDbContext>()
            .UseInMemoryDatabase("catalog-test")
            .Options;
        await using var db = new CatalogDbContext(options);
        var controller = new ProductsController(db);
        var dto = new CreateProductDto("Item", "Desc", 9.99m);

        var result = await controller.Create(dto);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.NotEqual(Guid.Empty, (Guid)created.Value!);
        Assert.Single(db.Products);
    }
}

