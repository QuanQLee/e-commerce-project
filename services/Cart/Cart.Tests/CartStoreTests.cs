using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Cart.Api.Domain;
using Cart.Api.Controllers;
using Cart.Api.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using System.Net;
using System.Net.Http;
using System.Threading;

namespace Cart.Tests;

public class CartStoreTests
{
    [Fact]
    public async Task SetCartAsync_PersistsPerTenant()
    {
        var options = Microsoft.Extensions.Options.Options.Create(new MemoryDistributedCacheOptions());
        var cache = new MemoryDistributedCache(options);
        var store = new RedisCartStore(cache);
        var productId = Guid.NewGuid();

        await store.SetCartAsync("tenant-a", "u1", new List<CartItem>{ new CartItem { ProductId = productId, Quantity = 1 }});
        var cart = await store.GetCartAsync("tenant-a", "u1");
        var otherTenantCart = await store.GetCartAsync("tenant-b", "u1");

        Assert.Single(cart);
        Assert.Equal(productId, cart[0].ProductId);
        Assert.Empty(otherTenantCart);
    }

    [Fact]
    public async Task AddItem_UsesTenantScopedCart()
    {
        var options = Microsoft.Extensions.Options.Options.Create(new MemoryDistributedCacheOptions());
        var cache = new MemoryDistributedCache(options);
        var store = new RedisCartStore(cache);
        var productId = Guid.NewGuid();
        var inventoryHandler = new FakeInventoryHandler();
        var controller = new CartController(
            store,
            new FakeHttpClientFactory(new HttpClient(inventoryHandler)
            {
                BaseAddress = new Uri("http://inventory.test")
            }),
            NullLogger<CartController>.Instance)
        {
            ControllerContext = BuildContext("tenant-a")
        };

        var result = await controller.AddItem("u1", new CartController.ModifyItemDto(productId, 2));

        Assert.IsType<OkResult>(result);
        Assert.Equal("tenant-a", inventoryHandler.LastTenantId);
        Assert.Single(await store.GetCartAsync("tenant-a", "u1"));
        Assert.Empty(await store.GetCartAsync("tenant-b", "u1"));
    }

    private static ControllerContext BuildContext(string tenantId)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-Tenant-Id"] = tenantId;
        return new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private sealed class FakeHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class FakeInventoryHandler : HttpMessageHandler
    {
        public string? LastTenantId { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            request.Headers.TryGetValues("X-Tenant-Id", out var values);
            LastTenantId = values?.FirstOrDefault();
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"quantity\":10}")
            });
        }
    }
}

