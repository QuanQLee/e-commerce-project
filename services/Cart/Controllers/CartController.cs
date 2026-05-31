using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Cart.Api.Domain;
using Cart.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Prometheus;

namespace Cart.Api.Controllers;

[ApiController]
[Route("cart/{userId}")]
public class CartController(ICartStore store, IHttpClientFactory httpClientFactory, ILogger<CartController> logger) : ControllerBase
{
    private static readonly Counter CheckoutCounter = Metrics.CreateCounter(
        "cart_checkout_total", "Total checkouts processed");
    private readonly HttpClient inventoryClient = httpClientFactory.CreateClient("inventory");
    private string TenantId => Request.Headers.TryGetValue("X-Tenant-Id", out var tenant)
        && !string.IsNullOrWhiteSpace(tenant)
        ? tenant.ToString().Trim()
        : "public";

    private static readonly TimeSpan[] StockRetryDelays =
    {
        TimeSpan.FromMilliseconds(50),
        TimeSpan.FromMilliseconds(150),
    };

    private sealed record StockResponse(int Quantity, int Reserved, int? Available)
    {
        public int AvailableQuantity => Available ?? Math.Max(0, Quantity - Reserved);
    }

    private async Task<StockResponse> GetStockAsync(Guid productId)
    {
        for (var attempt = 0; attempt <= StockRetryDelays.Length; attempt++)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, $"/inventory/{productId}");
                request.Headers.Add("X-Tenant-Id", TenantId);
                using var response = await inventoryClient.SendAsync(request, HttpContext.RequestAborted);
                if ((int)response.StatusCode >= 500 && attempt < StockRetryDelays.Length)
                {
                    await DelayStockRetry(attempt);
                    continue;
                }

                if (!response.IsSuccessStatusCode)
                {
                    logger.LogWarning(
                        "Inventory returned {StatusCode} for product {ProductId} in tenant {TenantId}",
                        (int)response.StatusCode,
                        productId,
                        TenantId);
                    return null;
                }

                return await response.Content.ReadFromJsonAsync<StockResponse>(cancellationToken: HttpContext.RequestAborted)
                    ?? new StockResponse(0, 0, 0);
            }
            catch (Exception ex) when (IsTransientInventoryError(ex) && attempt < StockRetryDelays.Length)
            {
                logger.LogWarning(
                    ex,
                    "Retrying inventory stock lookup for product {ProductId} in tenant {TenantId}",
                    productId,
                    TenantId);
                await DelayStockRetry(attempt);
            }
            catch (Exception ex) when (IsTransientInventoryError(ex))
            {
                logger.LogWarning(
                    ex,
                    "Inventory stock lookup failed for product {ProductId} in tenant {TenantId}",
                    productId,
                    TenantId);
                return null;
            }
        }

        return null;
    }

    private Task DelayStockRetry(int attempt)
        => Task.Delay(StockRetryDelays[attempt], HttpContext.RequestAborted);

    private bool IsTransientInventoryError(Exception ex)
        => ex is HttpRequestException
            || ex is TaskCanceledException && !HttpContext.RequestAborted.IsCancellationRequested;

    [HttpGet]
    public async Task<IList<CartItem>> Get(string userId)
        => await store.GetCartAsync(TenantId, userId);

    public record ModifyItemDto(Guid ProductId, int Quantity);

    [HttpPost("items")]
    public async Task<IActionResult> AddItem(string userId, [FromBody] ModifyItemDto dto)
    {
        if (dto.Quantity < 1)
            return BadRequest();
        var stock = await GetStockAsync(dto.ProductId);
        if (stock is null)
            return StatusCode(503);
        var available = stock.AvailableQuantity;
        var items = await store.GetCartAsync(TenantId, userId);
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
        await store.SetCartAsync(TenantId, userId, items);
        return Ok();
    }

    [HttpPut("items/{productId}")]
    public async Task<IActionResult> UpdateItem(string userId, Guid productId, [FromBody] ModifyItemDto dto)
    {
        if (dto.Quantity < 1)
            return BadRequest();
        var stock = await GetStockAsync(productId);
        if (stock is null)
            return StatusCode(503);
        var items = await store.GetCartAsync(TenantId, userId);
        var item = items.FirstOrDefault(i => i.ProductId == productId);
        if (item == null) return NotFound();
        if (dto.Quantity > stock.AvailableQuantity)
            return BadRequest();
        item.Quantity = dto.Quantity;
        await store.SetCartAsync(TenantId, userId, items);
        return Ok();
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout(string userId)
    {
        var items = await store.GetCartAsync(TenantId, userId);
        if (!items.Any()) return BadRequest();
        CheckoutCounter.Inc();
        // In real scenario call order service here
        await store.ClearCartAsync(TenantId, userId);
        return Ok(new { status = "order_created" });
    }
}

