using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Catalog.Api.Contracts;
using Catalog.Api.Controllers;
using Catalog.Api.Domain;
using Catalog.Api.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Tests;

public class ProductsControllerTests
{
    [Fact]
    public async Task Create_AddsProduct()
    {
        var options = new DbContextOptionsBuilder<CatalogDbContext>()
            .UseInMemoryDatabase($"catalog-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new CatalogDbContext(options);
        var controller = new ProductsController(db);
        controller.ControllerContext = BuildContext("tenant-a");
        var dto = new CreateProductDto("Item", "Desc", 9.99m);

        var result = await controller.Create(dto);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.NotEqual(Guid.Empty, (Guid)created.Value!);
        Assert.Single(db.Products);
        Assert.Equal("tenant-a", (await db.Products.SingleAsync()).TenantId);
    }

    [Fact]
    public async Task GetAll_FiltersByCategoryPrefix()
    {
        var options = new DbContextOptionsBuilder<CatalogDbContext>()
            .UseInMemoryDatabase($"catalog-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new CatalogDbContext(options);

        var rootProduct = new Product();
        rootProduct.Update("tenant-a", "Phone", "Phone", 100m, null, "electronics", 3);
        var childProduct = new Product();
        childProduct.Update("tenant-a", "Case", "Case", 10m, null, "electronics/accessories", 10);
        var otherProduct = new Product();
        otherProduct.Update("tenant-b", "Apple", "Fruit", 1m, null, "grocery", 50);

        db.Products.AddRange(rootProduct, childProduct, otherProduct);
        await db.SaveChangesAsync();

        var controller = new ProductsController(db);
        controller.ControllerContext = BuildContext("tenant-a");
        var result = await controller.GetAll("electronics");

        var list = Assert.IsType<List<Product>>(result.Value);
        Assert.Equal(2, list.Count);
        Assert.DoesNotContain(list, p => p.Category == "grocery");
    }

    [Fact]
    public async Task GetAll_PaginatesResultsAndWritesPageHeaders()
    {
        var options = new DbContextOptionsBuilder<CatalogDbContext>()
            .UseInMemoryDatabase($"catalog-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new CatalogDbContext(options);

        for (var i = 0; i < 3; i++)
        {
            var product = new Product();
            product.Update("tenant-a", $"Item {i}", "Desc", 10m + i, null, "catalog", 10);
            db.Products.Add(product);
        }
        await db.SaveChangesAsync();

        var controller = new ProductsController(db);
        controller.ControllerContext = BuildContext("tenant-a");
        var result = await controller.GetAll(page: 2, pageSize: 2);

        var list = Assert.IsType<List<Product>>(result.Value);
        Assert.Single(list);
        Assert.Equal("Item 2", list[0].Name);
        Assert.Equal("2", controller.Response.Headers["X-Page"].ToString());
        Assert.Equal("2", controller.Response.Headers["X-Page-Size"].ToString());
        Assert.Equal("200", controller.Response.Headers["X-Page-Size-Limit"].ToString());
    }

    [Fact]
    public async Task GetAll_RejectsPageValuesThatOverflowSkip()
    {
        var options = new DbContextOptionsBuilder<CatalogDbContext>()
            .UseInMemoryDatabase($"catalog-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new CatalogDbContext(options);
        var controller = new ProductsController(db);
        controller.ControllerContext = BuildContext("tenant-a");

        var result = await controller.GetAll(page: int.MaxValue, pageSize: 200);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Requested page is too deep.", badRequest.Value);
    }

    private static ControllerContext BuildContext(string tenantId)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-Tenant-Id"] = tenantId;
        return new ControllerContext
        {
            HttpContext = httpContext
        };
    }
}
