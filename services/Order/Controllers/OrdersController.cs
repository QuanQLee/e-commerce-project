using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order.Api.Domain;
using Order.Api.Infrastructure;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Prometheus;

namespace Order.Api.Controllers;

[ApiController]
[Route("orders")]
public class OrdersController(OrderDbContext db) : ControllerBase
{
    private static readonly Counter OrdersCreated = Metrics.CreateCounter(
        "orders_created_total", "Total orders created");
    private static readonly Counter StatusChanged = Metrics.CreateCounter(
        "orders_status_changed_total", "Order status transitions");
    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderEntity>>> GetAll()
        => await db.Orders.Include(o => o.Items).AsNoTracking().ToListAsync();

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderEntity>> Get(Guid id)
        => await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id)
            is { } order ? Ok(order) : NotFound();

    public record CreateOrderDto(Guid UserId, List<CreateOrderItemDto> Items);
    public record CreateOrderItemDto(string ProductName, decimal Price);

    [HttpPost]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateOrderDto dto)
    {
        var order = new OrderEntity { UserId = dto.UserId };
        foreach (var item in dto.Items)
        {
            order.AddItem(item.ProductName, item.Price);
        }
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        OrdersCreated.Inc();
        return CreatedAtAction(nameof(Get), new { id = order.Id }, order.Id);
    }

    public record UpdateStatusDto(OrderStatus Status);

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusDto dto)
    {
        var order = await db.Orders.FindAsync(id);
        if (order == null) return NotFound();
        order.UpdateStatus(dto.Status);
        await db.SaveChangesAsync();
        StatusChanged.Inc();
        return Ok();
    }
}
