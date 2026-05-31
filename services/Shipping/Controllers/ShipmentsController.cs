using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MassTransit;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shipping.Api.Contracts;
using Shipping.Api.Domain;
using Shipping.Api.Infrastructure;

namespace Shipping.Api.Controllers;

[ApiController]
[Route("shipments")]
public class ShipmentsController(ShippingDbContext db, IPublishEndpoint publisher) : ControllerBase
{
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 200;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAll(
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

        Response.Headers["X-Page"] = normalizedPage.ToString();
        Response.Headers["X-Page-Size"] = normalizedPageSize.ToString();
        Response.Headers["X-Page-Size-Limit"] = MaxPageSize.ToString();

        var shipments = await db.Shipments
            .AsNoTracking()
            .OrderByDescending(s => s.CreatedAt)
            .ThenByDescending(s => s.Id)
            .Skip((int)skip)
            .Take(normalizedPageSize)
            .ToListAsync();

        return Ok(shipments.Select(ToShipmentSummaryResponse));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> Get(Guid id)
    {
        var shipment = await db.Shipments
            .Include(s => s.Events.OrderByDescending(e => e.EventTime).Take(10))
            .FirstOrDefaultAsync(s => s.Id == id);
        return shipment is { } s ? Ok(ToShipmentResponse(s)) : NotFound();
    }

    public record CreateShipmentDto(string OrderId, decimal Weight = 1, string Destination = "CN", bool IsExpress = false);

    [HttpPost]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateShipmentDto dto)
    {
        var quote = ComputeQuote(dto.Weight, dto.Destination, dto.IsExpress);
        var shipment = new Shipment
        {
            OrderId = dto.OrderId,
            Carrier = quote.Carrier,
            ServiceLevel = quote.ServiceLevel,
            ShippingFee = quote.Fee,
            EstimatedDays = quote.EstimatedDays,
            Currency = quote.Currency,
        };

        db.Shipments.Add(shipment);
        await db.SaveChangesAsync();
        await publisher.Publish(new ShipmentCreated(shipment.Id, shipment.OrderId));

        return CreatedAtAction(nameof(Get), new { id = shipment.Id }, shipment.Id);
    }

    [HttpGet("{id:guid}/tracking")]
    public async Task<ActionResult<object>> Tracking(Guid id)
    {
        var shipment = await db.Shipments.Include(s => s.Events).FirstOrDefaultAsync(s => s.Id == id);
        if (shipment is null)
        {
            return NotFound();
        }

        return Ok(new
        {
            shipment.Id,
            shipment.Status,
            shipment.TrackingNumber,
            shipment.LastTrackingUpdatedAt,
            events = shipment.Events
                .OrderByDescending(e => e.EventTime)
                .Take(10)
                .Select(ToTrackingEventResponse),
        });
    }

    public record RateRequest(decimal Weight, string Destination, bool IsExpress = false);

    public record RateResponse(decimal Fee, int EstimatedDays, string Carrier, string ServiceLevel, string Currency);

    [HttpPost("/rates/calculate")]
    public ActionResult<RateResponse> CalculateRate([FromBody] RateRequest request)
    {
        var quote = ComputeQuote(request.Weight, request.Destination, request.IsExpress);
        return Ok(new RateResponse(quote.Fee, quote.EstimatedDays, quote.Carrier, quote.ServiceLevel, quote.Currency));
    }

    public record GenerateLabelRequest(string? Carrier = null);

    public record GenerateLabelResponse(string LabelUrl, string TrackingNumber, string Carrier, string ServiceLevel);

    [HttpPost("{id:guid}/label")]
    public async Task<ActionResult<GenerateLabelResponse>> GenerateLabel(Guid id, [FromBody] GenerateLabelRequest request)
    {
        var shipment = await db.Shipments.FindAsync(id);
        if (shipment is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.Carrier))
        {
            shipment.Carrier = request.Carrier;
        }

        if (string.IsNullOrWhiteSpace(shipment.TrackingNumber))
        {
            shipment.TrackingNumber = $"TRK-{DateTime.UtcNow:yyyyMMdd}-{shipment.Id:N}"[..32];
        }

        if (string.IsNullOrWhiteSpace(shipment.LabelUrl))
        {
            shipment.LabelUrl = $"https://labels.local/shipments/{shipment.Id}.pdf";
        }

        shipment.Status = "LabelCreated";
        await db.SaveChangesAsync();

        return Ok(new GenerateLabelResponse(
            shipment.LabelUrl,
            shipment.TrackingNumber,
            shipment.Carrier,
            shipment.ServiceLevel));
    }

    public record TrackingCallbackRequest(
        string Status,
        string? TrackingNumber,
        string? Location,
        string? Description,
        DateTime? EventTime);

    [HttpPost("{id:guid}/tracking/callback")]
    public async Task<IActionResult> TrackingCallback(Guid id, [FromBody] TrackingCallbackRequest request)
    {
        var shipment = await db.Shipments.FindAsync(id);
        if (shipment is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.TrackingNumber))
        {
            shipment.TrackingNumber = request.TrackingNumber;
        }

        var normalizedStatus = NormalizeStatus(request.Status);
        shipment.Status = normalizedStatus;
        shipment.LastTrackingUpdatedAt = DateTime.UtcNow;

        db.ShipmentTrackingEvents.Add(new ShipmentTrackingEvent
        {
            ShipmentId = shipment.Id,
            Status = normalizedStatus,
            Location = request.Location ?? string.Empty,
            Description = request.Description ?? string.Empty,
            EventTime = request.EventTime ?? DateTime.UtcNow,
        });

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/exception")]
    public async Task<IActionResult> RecordException(Guid id)
    {
        var shipment = await db.Shipments.FindAsync(id);
        if (shipment is null)
        {
            return NotFound();
        }

        shipment.Status = "Exception";
        shipment.LastTrackingUpdatedAt = DateTime.UtcNow;

        db.ShipmentTrackingEvents.Add(new ShipmentTrackingEvent
        {
            ShipmentId = shipment.Id,
            Status = "Exception",
            Description = "Exception manually recorded",
            EventTime = DateTime.UtcNow,
        });

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("/labels/callback")]
    public IActionResult LabelCallback() => NoContent();

    private static string NormalizeStatus(string raw)
    {
        var upper = raw.Trim().ToUpperInvariant();
        return upper switch
        {
            "IN_TRANSIT" or "TRANSIT" => "InTransit",
            "DELIVERED" => "Delivered",
            "EXCEPTION" or "FAILED" => "Exception",
            "OUT_FOR_DELIVERY" => "OutForDelivery",
            "PICKED_UP" => "PickedUp",
            _ => "InTransit",
        };
    }

    private static object ToShipmentResponse(Shipment shipment) => new
    {
        shipment.Id,
        shipment.OrderId,
        shipment.Status,
        shipment.Carrier,
        shipment.ServiceLevel,
        shipment.ShippingFee,
        shipment.EstimatedDays,
        shipment.Currency,
        shipment.TrackingNumber,
        shipment.LabelUrl,
        shipment.LastTrackingUpdatedAt,
        shipment.CreatedAt,
        Events = shipment.Events
            .OrderByDescending(e => e.EventTime)
            .Take(10)
            .Select(ToTrackingEventResponse),
    };

    private static object ToShipmentSummaryResponse(Shipment shipment) => new
    {
        shipment.Id,
        shipment.OrderId,
        shipment.Status,
        shipment.Carrier,
        shipment.ServiceLevel,
        shipment.ShippingFee,
        shipment.EstimatedDays,
        shipment.Currency,
        shipment.TrackingNumber,
        shipment.LabelUrl,
        shipment.LastTrackingUpdatedAt,
        shipment.CreatedAt,
    };

    private static object ToTrackingEventResponse(ShipmentTrackingEvent trackingEvent) => new
    {
        trackingEvent.Id,
        trackingEvent.ShipmentId,
        trackingEvent.Status,
        trackingEvent.Location,
        trackingEvent.Description,
        trackingEvent.EventTime,
        trackingEvent.CreatedAt,
    };

    private static (decimal Fee, int EstimatedDays, string Carrier, string ServiceLevel, string Currency) ComputeQuote(
        decimal weight,
        string destination,
        bool isExpress)
    {
        if (weight <= 0)
        {
            weight = 1;
        }

        var destinationCode = destination.Trim().ToUpperInvariant();
        var isDomestic = destinationCode.StartsWith("CN");

        decimal baseFee = isDomestic ? 8m : 25m;
        decimal perKg = isDomestic ? 2m : 6m;
        var fee = baseFee + (weight * perKg);

        var estimatedDays = isDomestic ? 3 : 7;
        var carrier = isDomestic ? "SF" : "DHL";
        var serviceLevel = "standard";

        if (weight >= 20)
        {
            carrier = "Freight";
            estimatedDays += 2;
        }

        if (isExpress)
        {
            fee *= 1.6m;
            estimatedDays = Math.Max(1, estimatedDays - 2);
            serviceLevel = "express";
        }

        return (decimal.Round(fee, 2), estimatedDays, carrier, serviceLevel, "CNY");
    }
}
