using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Cart.Api.Domain;
using Cart.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Prometheus;

namespace Cart.Api.Controllers;

[ApiController]
[Route("cart/{userId}")]
public class CartController(ICartStore store, IHttpClientFactory httpClientFactory) : ControllerBase
{
    private static readonly Counter CheckoutCounter = Metrics.CreateCounter(
        "cart_checkout_total", "Total checkouts processed");
    private readonly HttpClient inventoryClient = httpClientFactory.CreateClient("inventory");

    private record StockResponse(int quantity);

    [HttpGet]
    public async Task<IList<CartItem>> Get(string userId)
        => await store.GetCartAsync(userId);

    public record ModifyItemDto(Guid ProductId, int Quantity);

    [HttpPost("items")]
    public async Task<IActionResult> AddItem(string userId, [FromBody] ModifyItemDto dto)
    {
        if (dto.Quantity < 1)
            return BadRequest();
        var stock = await inventoryClient.GetFromJsonAsync<StockResponse>($"/inventory/{dto.ProductId}") ?? new StockResponse(0);
        var available = stock.quantity;
        var items = await store.GetCartAsync(userId);
        var existing = items.FirstOrDefault(i => i.ProductId == dto.ProductId);
        if (existing != null)
        {
            if (existing.Quantity + dto.Quantity > available)
                return BadRequest();
            existing.Quantity += dto.Quantity;
        }
        else
        {
            if (dto.Quantity > available)
                return BadRequest();
            items.Add(new CartItem { ProductId = dto.ProductId, Quantity = dto.Quantity });
        }
        await store.SetCartAsync(userId, items);
        return Ok();
    }

    [HttpPut("items/{productId}")]
    public async Task<IActionResult> UpdateItem(string userId, Guid productId, [FromBody] ModifyItemDto dto)
    {
        if (dto.Quantity < 1)
            return BadRequest();
        var stock = await inventoryClient.GetFromJsonAsync<StockResponse>($"/inventory/{productId}") ?? new StockResponse(0);
        var items = await store.GetCartAsync(userId);
        var item = items.FirstOrDefault(i => i.ProductId == productId);
        if (item == null) return NotFound();
        if (dto.Quantity > stock.quantity)
            return BadRequest();
        item.Quantity = dto.Quantity;
        await store.SetCartAsync(userId, items);
        return Ok();
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout(string userId)
    {
        var items = await store.GetCartAsync(userId);
        if (!items.Any()) return BadRequest();
        CheckoutCounter.Inc();
        // In real scenario call order service here
        await store.ClearCartAsync(userId);
        return Ok(new { status = "order_created" });
    }
}

