using System;
using System.Collections.Generic;
using Catalog.Api.Contracts;
using Catalog.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace Catalog.Api.Controllers;

[ApiController]
[Route("product-center")]
public class ProductCenterController(ProductCenterStore store) : ControllerBase
{
    private string TenantId => Request.Headers.TryGetValue("X-Tenant-Id", out var tenant)
        && !string.IsNullOrWhiteSpace(tenant)
        ? tenant.ToString().Trim()
        : "public";

    [HttpGet("brands")]
    public ActionResult<IEnumerable<BrandDto>> ListBrands([FromQuery] bool activeOnly = false)
        => Ok(store.ListBrands(TenantId, activeOnly));

    [HttpPost("brands")]
    public ActionResult<BrandDto> CreateBrand([FromBody] CreateBrandDto dto)
    {
        try
        {
            var created = store.CreateBrand(TenantId, dto.Code, dto.Name, dto.IsActive);
            return Ok(created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpGet("attribute-templates")]
    public ActionResult<IEnumerable<AttributeTemplateDto>> ListTemplates([FromQuery] string? categoryPath = null)
        => Ok(store.ListTemplates(TenantId, categoryPath));

    [HttpPost("attribute-templates")]
    public ActionResult<AttributeTemplateDto> CreateTemplate([FromBody] CreateAttributeTemplateDto dto)
    {
        try
        {
            var created = store.CreateTemplate(TenantId, dto.Code, dto.Name, dto.CategoryPath, dto.Attributes);
            return Ok(created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpPut("spu-constraints")]
    public ActionResult<SpuConstraintDto> UpsertConstraint([FromBody] UpsertSpuConstraintDto dto)
    {
        try
        {
            var updated = store.UpsertConstraint(TenantId, dto.CategoryPath, dto.RequiredAttributes, dto.VariantAttributes);
            return Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("spu-constraints/{*categoryPath}")]
    public ActionResult<SpuConstraintDto> GetConstraint(string categoryPath)
        => store.TryGetConstraint(TenantId, categoryPath, out var value) ? Ok(value) : NotFound();

    [HttpPost("spu-constraints/validate")]
    public ActionResult<SpuValidationResultDto> Validate([FromQuery] string categoryPath, [FromBody] ValidateSpuSpecsDto dto)
    {
        try
        {
            var result = store.Validate(TenantId, categoryPath, dto.Skus ?? []);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }
}
