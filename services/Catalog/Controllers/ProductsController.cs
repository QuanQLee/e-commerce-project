using Catalog.Api.Contracts;
using Catalog.Api.Domain;
using Catalog.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Catalog.Api.Controllers;

[ApiController]
[Route("products")]
public class ProductsController(CatalogDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetAll()
        => await db.Products.AsNoTracking().ToListAsync();

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Product>> Get(Guid id)
        => await db.Products.FindAsync(id) is { } p ? Ok(p) : NotFound();

    [HttpPost]
    public async Task<ActionResult<Guid>> Create(
        [FromBody] CreateProductDto dto)
    {
        var product = new Product();
        product.Update(dto.Name, dto.Description, dto.Price);
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = product.Id }, product.Id);
    }
}
