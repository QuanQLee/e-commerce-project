using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Catalog.Api.Contracts;
using Catalog.Api.Controllers;
using Catalog.Api.Domain;
using Catalog.Api.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Tests;

public class ProductSkusControllerTests
{
    [Fact]
    public async Task Create_And_List_Skus_PersistsData()
    {
        var options = new DbContextOptionsBuilder<CatalogDbContext>()
            .UseInMemoryDatabase($"catalog-sku-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new CatalogDbContext(options);

        var product = new Product();
        product.Update("Phone", "Smart phone", 3999m, null, "electronics/phones", 10);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var controller = new ProductSkusController(db);
        controller.ControllerContext = BuildContext("public");
        var create = await controller.Create(
            product.Id,
            new CreateSkuDto(
                "PHONE-BLK-128",
                3999m,
                5,
                new Dictionary<string, string> { ["color"] = "black", ["storage"] = "128g" }
            )
        );

        var created = Assert.IsType<CreatedAtActionResult>(create.Result);
        var dto = Assert.IsType<ProductSkuDto>(created.Value);
        Assert.Equal("PHONE-BLK-128", dto.Code);

        var listed = await controller.List(product.Id);
        var enumerable = Assert.IsAssignableFrom<IEnumerable<ProductSkuDto>>(Assert.IsType<OkObjectResult>(listed.Result).Value);
        var list = enumerable.ToList();
        Assert.Single(list);
    }

    [Fact]
    public async Task Update_And_Delete_Sku_Works()
    {
        var options = new DbContextOptionsBuilder<CatalogDbContext>()
            .UseInMemoryDatabase($"catalog-sku-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new CatalogDbContext(options);

        var product = new Product();
        product.Update("Phone", "Smart phone", 3999m, null, "electronics/phones", 10);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var controller = new ProductSkusController(db);
        controller.ControllerContext = BuildContext("public");
        var create = await controller.Create(
            product.Id,
            new CreateSkuDto("PHONE-BLK-128", 3999m, 5, new Dictionary<string, string> { ["color"] = "black" })
        );
        var created = Assert.IsType<ProductSkuDto>(Assert.IsType<CreatedAtActionResult>(create.Result).Value);

        var update = await controller.Update(
            product.Id,
            created.Id,
            new UpdateSkuDto("PHONE-BLK-256", 4299m, 7, new Dictionary<string, string> { ["storage"] = "256g" })
        );
        var updated = Assert.IsType<ProductSkuDto>(Assert.IsType<OkObjectResult>(update.Result).Value);
        Assert.Equal("PHONE-BLK-256", updated.Code);
        Assert.Equal(4299m, updated.Price);

        var delete = await controller.Delete(product.Id, created.Id);
        Assert.IsType<NoContentResult>(delete);

        var listed = await controller.List(product.Id);
        var enumerable = Assert.IsAssignableFrom<IEnumerable<ProductSkuDto>>(Assert.IsType<OkObjectResult>(listed.Result).Value);
        Assert.Empty(enumerable);
    }

    [Fact]
    public async Task BatchCreate_ReturnsSummary_AndErrors()
    {
        var options = new DbContextOptionsBuilder<CatalogDbContext>()
            .UseInMemoryDatabase($"catalog-sku-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new CatalogDbContext(options);

        var product = new Product();
        product.Update("Phone", "Smart phone", 3999m, null, "electronics/phones", 10);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var controller = new ProductSkusController(db);
        controller.ControllerContext = BuildContext("public");
        var batch = await controller.BatchCreate(
            product.Id,
            new BatchCreateSkusDto(
                new List<CreateSkuDto>
                {
                    new("SKU-1", 100m, 10, new Dictionary<string, string> { ["color"] = "black" }),
                    new("SKU-2", 200m, 10, null),
                    new("", 300m, 5, null),
                    new("SKU-2", 250m, 9, null)
                }
            )
        );

        var ok = Assert.IsType<OkObjectResult>(batch.Result);
        var result = Assert.IsType<BatchCreateSkusResultDto>(ok.Value);
        Assert.Equal(4, result.Requested);
        Assert.Equal(2, result.Created);
        Assert.Equal(1, result.Skipped);
        Assert.Single(result.Errors);
        Assert.Equal(2, result.Errors[0].Index);
    }

    [Fact]
    public async Task BatchUpdate_UpdatesPriceAndStock()
    {
        var options = new DbContextOptionsBuilder<CatalogDbContext>()
            .UseInMemoryDatabase($"catalog-sku-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new CatalogDbContext(options);

        var product = new Product();
        product.Update("Phone", "Smart phone", 3999m, null, "electronics/phones", 10);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var controller = new ProductSkusController(db);
        controller.ControllerContext = BuildContext("public");
        await controller.Create(product.Id, new CreateSkuDto("SKU-1", 100m, 10));
        await controller.Create(product.Id, new CreateSkuDto("SKU-2", 200m, 20));

        var update = await controller.BatchUpdate(
            product.Id,
            new BatchUpdateSkusDto(
                new List<BatchUpdateSkuItemDto>
                {
                    new("SKU-1", 150m, 15, null),
                    new("SKU-2", null, 99, false),
                    new("SKU-404", 1m, 1, null),
                    new("", 1m, 1, null)
                }
            )
        );

        var result = Assert.IsType<BatchUpdateSkusResultDto>(Assert.IsType<OkObjectResult>(update.Result).Value);
        Assert.Equal(4, result.Requested);
        Assert.Equal(2, result.Updated);
        Assert.Equal(1, result.NotFound);
        Assert.Single(result.Errors);

        var list = await controller.List(product.Id);
        var skus = Assert.IsAssignableFrom<IEnumerable<ProductSkuDto>>(Assert.IsType<OkObjectResult>(list.Result).Value).ToList();
        Assert.Contains(skus, s => s.Code == "SKU-1" && s.Price == 150m && s.Stock == 15);
        Assert.Contains(skus, s => s.Code == "SKU-2" && s.Stock == 99 && !s.IsActive);
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
