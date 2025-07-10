using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Cart.Api.Domain;
using Cart.Api.Infrastructure;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;

namespace Cart.Tests;

public class CartStoreTests
{
    [Fact]
    public async Task AddItem_PersistsToStore()
    {
        var options = Microsoft.Extensions.Options.Options.Create(new MemoryDistributedCacheOptions());
        var cache = new MemoryDistributedCache(options);
        var store = new RedisCartStore(cache);

        await store.SetCartAsync("u1", new List<CartItem>{ new CartItem { ProductId = Guid.NewGuid(), Quantity = 1 }});
        var cart = await store.GetCartAsync("u1");

        Assert.Single(cart);
    }
}

