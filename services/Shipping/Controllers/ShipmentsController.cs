using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shipping.Api.Domain;
using Shipping.Api.Infrastructure;
using MassTransit;
using Shipping.Api.Contracts;

namespace Shipping.Api.Controllers;

[ApiController]
[Route("shipments")]
public class ShipmentsController(ShippingDbContext db, IPublishEndpoint publisher) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Shipment>>> GetAll() => await db.Shipments.AsNoTracking().ToListAsync();

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Shipment>> Get(Guid id) =>
        await db.Shipments.FindAsync(id) is { } s ? Ok(s) : NotFound();

    public record CreateShipmentDto(string OrderId);

    [HttpPost]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateShipmentDto dto)
    {
        var shipment = new Shipment { OrderId = dto.OrderId };
        db.Shipments.Add(shipment);
        await db.SaveChangesAsync();
        await publisher.Publish(new ShipmentCreated(shipment.Id, shipment.OrderId));
        return CreatedAtAction(nameof(Get), new { id = shipment.Id }, shipment.Id);
    }

    [HttpGet("{id:guid}/tracking")]
    public async Task<ActionResult<string>> Tracking(Guid id)
    {
        var shipment = await db.Shipments.FindAsync(id);
        return shipment is null ? NotFound() : Ok($"Status: {shipment.Status}");
    }

    public record RateRequest(decimal Weight, string Destination);

    [HttpPost("/rates/calculate")]
    public ActionResult<decimal> CalculateRate([FromBody] RateRequest request)
    {
        // simplified rate calculation
        var rate = request.Weight * 1.25m;
        return Ok(rate);
    }

    [HttpPost("{id:guid}/exception")]
    public async Task<IActionResult> RecordException(Guid id)
    {
        var shipment = await db.Shipments.FindAsync(id);
        if (shipment is null) return NotFound();
        shipment.Status = "Exception";
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("/labels/callback")]
    public IActionResult LabelCallback() => NoContent();
}
