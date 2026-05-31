using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using User.Api.Domain;
using User.Api.Infrastructure;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace User.Api.Controllers;

[ApiController]
[Route("users")]
public class UsersController(UserDbContext db) : ControllerBase
{
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 200;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserEntity>>> GetAll(
        [FromQuery] string? tenantId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = DefaultPageSize)
    {
        var normalizedPage = Math.Max(page, 1);
        var normalizedPageSize = Math.Clamp(pageSize, 1, MaxPageSize);
        var skip = (long)(normalizedPage - 1) * normalizedPageSize;
        if (skip > int.MaxValue)
        {
            return BadRequest("Requested page is too deep.");
        }

        var query = db.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(tenantId))
        {
            var normalizedTenantId = tenantId.Trim();
            query = query.Where(u => u.TenantId == normalizedTenantId);
        }

        Response.Headers["X-Page"] = normalizedPage.ToString();
        Response.Headers["X-Page-Size"] = normalizedPageSize.ToString();
        Response.Headers["X-Page-Size-Limit"] = MaxPageSize.ToString();

        return await query
            .OrderByDescending(u => u.CreatedAt)
            .ThenByDescending(u => u.Id)
            .Skip((int)skip)
            .Take(normalizedPageSize)
            .ToListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserEntity>> Get(Guid id)
        => await db.Users.FindAsync(id) is { } user ? Ok(user) : NotFound();

    public record CreateUserDto(string UserName, string Email, string? TenantId = null, string? AuthSubjectId = null);

    [HttpPost]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateUserDto dto)
    {
        var user = new UserEntity
        {
            AuthSubjectId = string.IsNullOrWhiteSpace(dto.AuthSubjectId) ? null : dto.AuthSubjectId.Trim(),
            UserName = dto.UserName,
            Email = dto.Email,
            TenantId = string.IsNullOrWhiteSpace(dto.TenantId) ? "public" : dto.TenantId.Trim(),
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = user.Id }, user.Id);
    }

    [HttpGet("by-username/{username}")]
    public async Task<ActionResult<object>> GetByUsername(string username, [FromQuery] string? tenantId = null)
    {
        var normalized = username.Trim().ToLower();
        var query = db.Users.AsNoTracking()
            .Where(u => u.UserName.ToLower() == normalized);
        if (!string.IsNullOrWhiteSpace(tenantId))
        {
            var normalizedTenantId = tenantId.Trim();
            query = query.Where(u => u.TenantId == normalizedTenantId);
        }
        var matches = await query.Take(2).ToListAsync();
        if (matches.Count > 1 && string.IsNullOrWhiteSpace(tenantId))
        {
            return Conflict(new
            {
                error = "Multiple users matched this username across tenants. Provide tenantId.",
            });
        }

        var user = matches.FirstOrDefault();
        if (user is null)
        {
            return NotFound();
        }

        return Ok(new
        {
            user.Id,
            user.AuthSubjectId,
            user.UserName,
            user.TenantId,
            user.Email,
        });
    }

    [HttpGet("by-auth-subject/{authSubjectId}")]
    public async Task<ActionResult<object>> GetByAuthSubject(string authSubjectId)
    {
        var normalized = authSubjectId.Trim();
        var user = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.AuthSubjectId == normalized);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(new
        {
            user.Id,
            user.AuthSubjectId,
            user.UserName,
            user.TenantId,
            user.Email,
        });
    }
}

