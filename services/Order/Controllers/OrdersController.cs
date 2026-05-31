using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order.Api.Domain;
using Order.Api.Infrastructure;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Diagnostics.Metrics;

namespace Order.Api.Controllers;

[ApiController]
[Route("orders")]
public class OrdersController(OrderDbContext db) : ControllerBase
{
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 200;
    private static readonly Meter Meter = new("order-service.metrics");
    private static readonly Counter<long> OrdersCreated = Meter.CreateCounter<long>(
        "orders_created_total", description: "Total orders created");
    private static readonly Counter<long> StatusChanged = Meter.CreateCounter<long>(
        "orders_status_changed_total", description: "Order status transitions");
    private string TenantId => Request.Headers.TryGetValue("X-Tenant-Id", out var tenant)
        && !string.IsNullOrWhiteSpace(tenant)
        ? tenant.ToString().Trim()
        : "public";

    private bool TryResolveCurrentUserId(
        Guid? requestedUserId,
        bool requireUserId,
        out Guid? resolvedUserId,
        out ActionResult? errorResult
    )
    {
        if (Request.Headers.TryGetValue("X-User-Id", out var currentUserIdHeader)
            && !string.IsNullOrWhiteSpace(currentUserIdHeader))
        {
            if (!Guid.TryParse(currentUserIdHeader.ToString().Trim(), out var parsedCurrentUserId))
            {
                resolvedUserId = null;
                errorResult = BadRequest("X-User-Id header must be a valid GUID.");
                return false;
            }

            resolvedUserId = parsedCurrentUserId;
            errorResult = null;
            return true;
        }

        if (requestedUserId.HasValue)
        {
            resolvedUserId = requestedUserId.Value;
            errorResult = null;
            return true;
        }

        if (requireUserId)
        {
            resolvedUserId = null;
            errorResult = BadRequest("A user identifier is required.");
            return false;
        }

        resolvedUserId = null;
        errorResult = null;
        return true;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderEntity>>> GetAll(
        [FromQuery] Guid? userId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = DefaultPageSize)
    {
        if (!TryResolveCurrentUserId(userId, false, out var effectiveUserId, out var errorResult))
        {
            return errorResult!;
        }

        var normalizedPage = Math.Max(page, 1);
        var normalizedPageSize = Math.Clamp(pageSize, 1, MaxPageSize);
        var skip = (long)(normalizedPage - 1) * normalizedPageSize;
        if (skip > int.MaxValue)
        {
            return BadRequest("Requested page is too deep.");
        }

        var query = db.Orders
            .Include(o => o.Items.Where(i => i.TenantId == TenantId))
            .AsNoTracking()
            .AsSplitQuery()
            .Where(o => o.TenantId == TenantId);

        if (effectiveUserId.HasValue)
        {
            query = query.Where(o => o.UserId == effectiveUserId.Value);
        }

        Response.Headers["X-Page"] = normalizedPage.ToString();
        Response.Headers["X-Page-Size"] = normalizedPageSize.ToString();
        Response.Headers["X-Page-Size-Limit"] = MaxPageSize.ToString();

        return await query
            .OrderByDescending(o => o.CreatedAt)
            .ThenByDescending(o => o.Id)
            .Skip((int)skip)
            .Take(normalizedPageSize)
            .ToListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderEntity>> Get(Guid id)
    {
        if (!TryResolveCurrentUserId(null, false, out var effectiveUserId, out var errorResult))
        {
            return errorResult!;
        }

        var query = db.Orders
            .Include(o => o.Items.Where(i => i.TenantId == TenantId))
            .AsNoTracking()
            .Where(o => o.Id == id && o.TenantId == TenantId);
        if (effectiveUserId.HasValue)
        {
            query = query.Where(o => o.UserId == effectiveUserId.Value);
        }

        return await query.FirstOrDefaultAsync() is { } order ? Ok(order) : NotFound();
    }

    public record CreateOrderDto(Guid? UserId, List<CreateOrderItemDto> Items, decimal Total);
    public record CreateOrderItemDto(string ProductName, decimal Price);

    [HttpPost]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateOrderDto dto)
    {
        if (!TryResolveCurrentUserId(dto.UserId, true, out var effectiveUserId, out var errorResult))
        {
            return errorResult!;
        }

        var calculated = dto.Items.Sum(i => i.Price);
        if (dto.Total != calculated)
            return BadRequest();
        if (dto.Items.Any(i => i.Price <= 0))
            return BadRequest();
        var order = new OrderEntity { UserId = effectiveUserId!.Value };
        order.AssignTenant(TenantId);
        foreach (var item in dto.Items)
        {
            order.AddItem(item.ProductName, item.Price);
        }
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        OrdersCreated.Add(1);
        return CreatedAtAction(nameof(Get), new { id = order.Id }, order.Id);
    }

    public record UpdateStatusDto(OrderStatus Status);

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusDto dto)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.TenantId == TenantId);
        if (order == null) return NotFound();
        order.UpdateStatus(dto.Status);
        await db.SaveChangesAsync();
        StatusChanged.Add(1);
        return Ok();
    }
}



