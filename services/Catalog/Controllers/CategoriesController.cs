using System;
using System.Collections.Generic;
using Catalog.Api.Contracts;
using Catalog.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace Catalog.Api.Controllers;

[ApiController]
[Route("categories")]
public class CategoriesController(CategoryStore categories) : ControllerBase
{
    [HttpGet]
    public ActionResult<IEnumerable<CategoryItem>> List([FromQuery] bool activeOnly = false)
        => Ok(categories.List(activeOnly));

    [HttpGet("{*path}")]
    public ActionResult<CategoryItem> Get(string path)
        => categories.TryGet(path, out var category) ? Ok(category) : NotFound();

    [HttpPost]
    public ActionResult<CategoryItem> Create([FromBody] CreateCategoryDto dto)
    {
        try
        {
            var created = categories.Create(dto.Path, dto.Name, dto.ParentPath, dto.IsActive);
            return CreatedAtAction(nameof(Get), new { path = created.Path }, created);
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

    [HttpPatch("status")]
    public ActionResult<CategoryItem> UpdateStatus([FromBody] UpdateCategoryStatusDto dto)
    {
        try
        {
            var updated = categories.SetStatus(dto.Path, dto.IsActive);
            return Ok(updated);
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
