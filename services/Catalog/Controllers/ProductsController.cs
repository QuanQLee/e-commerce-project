using Catalog.Api.Contracts;
using Catalog.Api.Domain;
using Catalog.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Catalog.Api.Controllers;

[ApiController]
[Route("products")]
public class ProductsController(CatalogDbContext db) : ControllerBase
{
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 200;

    private string TenantId => Request.Headers.TryGetValue("X-Tenant-Id", out var tenant)
        && !string.IsNullOrWhiteSpace(tenant)
        ? tenant.ToString().Trim()
        : "public";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetAll(
        [FromQuery] string? category = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = DefaultPageSize)
    {
        var normalizedPage = Math.Max(page, 1);
        var normalizedPageSize = Math.Clamp(pageSize, 1, MaxPageSize);
        var query = db.Products.AsNoTracking().Where(p => p.TenantId == TenantId);
        if (!string.IsNullOrWhiteSpace(category))
        {
            var normalized = category.Trim();
            query = query.Where(p =>
                p.Category == normalized ||
                EF.Functions.Like(p.Category, $"{normalized}/%"));
        }

        var skip = (long)(normalizedPage - 1) * normalizedPageSize;
        if (skip > int.MaxValue)
        {
            return BadRequest("Requested page is too deep.");
        }

        Response.Headers["X-Page"] = normalizedPage.ToString();
        Response.Headers["X-Page-Size"] = normalizedPageSize.ToString();
        Response.Headers["X-Page-Size-Limit"] = MaxPageSize.ToString();

        return await query
            .OrderBy(p => p.Name)
            .ThenBy(p => p.Id)
            .Skip((int)skip)
            .Take(normalizedPageSize)
            .ToListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Product>> Get(Guid id)
        => await db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id && p.TenantId == TenantId) is { } p ? Ok(p) : NotFound();

    [HttpPost]
    public async Task<ActionResult<Guid>> Create(
        [FromBody] CreateProductDto dto)
    {
        var product = new Product();
        product.Update(TenantId, dto.Name, dto.Description, dto.Price, dto.ImageUrl, dto.Category, dto.Stock);
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = product.Id }, product.Id);
    }
}

