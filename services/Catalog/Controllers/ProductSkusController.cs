using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Catalog.Api.Contracts;
using Catalog.Api.Domain;
using Catalog.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Controllers;

[ApiController]
[Route("products/{productId:guid}/skus")]
public class ProductSkusController(CatalogDbContext db) : ControllerBase
{
    private string TenantId => Request.Headers.TryGetValue("X-Tenant-Id", out var tenant)
        && !string.IsNullOrWhiteSpace(tenant)
        ? tenant.ToString().Trim()
        : "public";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductSkuDto>>> List(Guid productId, [FromQuery] bool activeOnly = false)
    {
        var exists = await db.Products.AsNoTracking().AnyAsync(p => p.Id == productId && p.TenantId == TenantId);
        if (!exists)
        {
            return NotFound(new { error = "product not found" });
        }

        var query = db.ProductSkus.AsNoTracking().Where(s => s.ProductId == productId && s.TenantId == TenantId);
        if (activeOnly)
        {
            query = query.Where(s => s.IsActive);
        }

        var items = await query.OrderBy(s => s.Code).ToListAsync();
        return Ok(items.Select(ToDto));
    }

    [HttpPost]
    public async Task<ActionResult<ProductSkuDto>> Create(Guid productId, [FromBody] CreateSkuDto dto)
    {
        var exists = await db.Products.AsNoTracking().AnyAsync(p => p.Id == productId && p.TenantId == TenantId);
        if (!exists)
        {
            return NotFound(new { error = "product not found" });
        }

        try
        {
            var entity = ProductSku.Create(
                TenantId,
                productId,
                dto.Code.Trim(),
                dto.Price,
                dto.Stock,
                JsonSerializer.Serialize(dto.Attributes ?? new Dictionary<string, string>())
            );
            db.ProductSkus.Add(entity);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(Get), new { productId, skuId = entity.Id }, ToDto(entity));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (DbUpdateException)
        {
            return Conflict(new { error = "sku already exists for this product" });
        }
    }

    [HttpGet("{skuId:guid}")]
    public async Task<ActionResult<ProductSkuDto>> Get(Guid productId, Guid skuId)
    {
        var exists = await db.Products.AsNoTracking().AnyAsync(p => p.Id == productId && p.TenantId == TenantId);
        if (!exists)
        {
            return NotFound(new { error = "product not found" });
        }

        var sku = await db.ProductSkus.AsNoTracking().FirstOrDefaultAsync(s => s.ProductId == productId && s.Id == skuId && s.TenantId == TenantId);
        return sku is not null ? Ok(ToDto(sku)) : NotFound(new { error = "sku not found" });
    }

    [HttpPatch("{skuId:guid}/status")]
    public async Task<ActionResult<ProductSkuDto>> UpdateStatus(Guid productId, Guid skuId, [FromBody] UpdateSkuStatusDto dto)
    {
        var sku = await db.ProductSkus.FirstOrDefaultAsync(s => s.ProductId == productId && s.Id == skuId && s.TenantId == TenantId);
        if (sku is null)
        {
            return NotFound(new { error = "sku not found" });
        }

        sku.SetStatus(dto.IsActive);
        await db.SaveChangesAsync();
        return Ok(ToDto(sku));
    }

    [HttpPut("{skuId:guid}")]
    public async Task<ActionResult<ProductSkuDto>> Update(Guid productId, Guid skuId, [FromBody] UpdateSkuDto dto)
    {
        var sku = await db.ProductSkus.FirstOrDefaultAsync(s => s.ProductId == productId && s.Id == skuId && s.TenantId == TenantId);
        if (sku is null)
        {
            return NotFound(new { error = "sku not found" });
        }

        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            return BadRequest(new { error = "sku code cannot be empty" });
        }

        var duplicated = await db.ProductSkus.AnyAsync(s =>
            s.TenantId == TenantId &&
            s.ProductId == productId &&
            s.Id != skuId &&
            s.Code == dto.Code);
        if (duplicated)
        {
            return Conflict(new { error = "sku already exists for this product" });
        }

        sku.Update(
            dto.Code.Trim(),
            dto.Price,
            dto.Stock,
            JsonSerializer.Serialize(dto.Attributes ?? new Dictionary<string, string>())
        );
        await db.SaveChangesAsync();
        return Ok(ToDto(sku));
    }

    [HttpDelete("{skuId:guid}")]
    public async Task<IActionResult> Delete(Guid productId, Guid skuId)
    {
        var sku = await db.ProductSkus.FirstOrDefaultAsync(s => s.ProductId == productId && s.Id == skuId && s.TenantId == TenantId);
        if (sku is null)
        {
            return NotFound(new { error = "sku not found" });
        }

        db.ProductSkus.Remove(sku);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("batch")]
    public async Task<ActionResult<BatchCreateSkusResultDto>> BatchCreate(Guid productId, [FromBody] BatchCreateSkusDto dto)
    {
        var exists = await db.Products.AsNoTracking().AnyAsync(p => p.Id == productId && p.TenantId == TenantId);
        if (!exists)
        {
            return NotFound(new { error = "product not found" });
        }

        var items = dto.Items ?? new List<CreateSkuDto>();
        var createdCount = 0;
        var skippedCount = 0;
        var errors = new List<BatchSkuErrorDto>();

        var existingCodes = await db.ProductSkus
            .AsNoTracking()
            .Where(s => s.ProductId == productId && s.TenantId == TenantId)
            .Select(s => s.Code)
            .ToListAsync();
        var codeSet = new HashSet<string>(existingCodes, StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i];
            var code = item.Code?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(code))
            {
                errors.Add(new BatchSkuErrorDto(i, code, "code is empty"));
                continue;
            }
            if (item.Price < 0)
            {
                errors.Add(new BatchSkuErrorDto(i, code, "price must be >= 0"));
                continue;
            }
            if (item.Stock < 0)
            {
                errors.Add(new BatchSkuErrorDto(i, code, "stock must be >= 0"));
                continue;
            }
            if (codeSet.Contains(code))
            {
                skippedCount++;
                continue;
            }

            var entity = ProductSku.Create(
                TenantId,
                productId,
                code,
                item.Price,
                item.Stock,
                JsonSerializer.Serialize(item.Attributes ?? new Dictionary<string, string>())
            );
            db.ProductSkus.Add(entity);
            codeSet.Add(code);
            createdCount++;
        }

        await db.SaveChangesAsync();
        var result = new BatchCreateSkusResultDto(
            Requested: items.Count,
            Created: createdCount,
            Skipped: skippedCount,
            Errors: errors);
        return Ok(result);
    }

    [HttpPatch("batch-update")]
    public async Task<ActionResult<BatchUpdateSkusResultDto>> BatchUpdate(Guid productId, [FromBody] BatchUpdateSkusDto dto)
    {
        var exists = await db.Products.AsNoTracking().AnyAsync(p => p.Id == productId && p.TenantId == TenantId);
        if (!exists)
        {
            return NotFound(new { error = "product not found" });
        }

        var items = dto.Items ?? new List<BatchUpdateSkuItemDto>();
        var updated = 0;
        var notFound = 0;
        var errors = new List<BatchSkuErrorDto>();

        var rows = await db.ProductSkus.Where(s => s.ProductId == productId && s.TenantId == TenantId).ToListAsync();
        var byCode = rows.ToDictionary(s => s.Code, StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i];
            var code = item.Code?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(code))
            {
                errors.Add(new BatchSkuErrorDto(i, code, "code is empty"));
                continue;
            }
            if (!byCode.TryGetValue(code, out var sku))
            {
                notFound++;
                continue;
            }
            if (item.Price.HasValue && item.Price.Value < 0)
            {
                errors.Add(new BatchSkuErrorDto(i, code, "price must be >= 0"));
                continue;
            }
            if (item.Stock.HasValue && item.Stock.Value < 0)
            {
                errors.Add(new BatchSkuErrorDto(i, code, "stock must be >= 0"));
                continue;
            }

            var nextPrice = item.Price ?? sku.Price;
            var nextStock = item.Stock ?? sku.Stock;
            var attrs = sku.AttributesJson;
            sku.Update(code, nextPrice, nextStock, attrs);
            if (item.IsActive.HasValue)
            {
                sku.SetStatus(item.IsActive.Value);
            }
            updated++;
        }

        await db.SaveChangesAsync();
        return Ok(new BatchUpdateSkusResultDto(items.Count, updated, notFound, errors));
    }

    private static ProductSkuDto ToDto(ProductSku entity)
    {
        Dictionary<string, string>? attrs = null;
        try
        {
            attrs = JsonSerializer.Deserialize<Dictionary<string, string>>(entity.AttributesJson);
        }
        catch
        {
            attrs = null;
        }

        return new ProductSkuDto(
            entity.Id,
            entity.ProductId,
            entity.Code,
            entity.Price,
            entity.Stock,
            attrs ?? new Dictionary<string, string>(),
            entity.IsActive,
            entity.CreatedAtUtc,
            entity.UpdatedAtUtc);
    }
}
