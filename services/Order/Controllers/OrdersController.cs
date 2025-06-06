using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order.Api.Domain;
using Order.Api.Infrastructure;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Order.Api.Controllers;

[ApiController]
[Route("orders")]
public class OrdersController(OrderDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderEntity>>> GetAll()
        => await db.Orders.Include(o => o.Items).AsNoTracking().ToListAsync();

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderEntity>> Get(Guid id)
        => await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id)
            is { } order ? Ok(order) : NotFound();

    public record CreateOrderDto(List<CreateOrderItemDto> Items);
    public record CreateOrderItemDto(string ProductName, decimal Price);

    [HttpPost]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateOrderDto dto)
    {
        var order = new OrderEntity();
        foreach (var item in dto.Items)
        {
            order.AddItem(item.ProductName, item.Price);
        }
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = order.Id }, order.Id);
    }
}
