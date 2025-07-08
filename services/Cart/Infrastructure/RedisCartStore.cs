using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Cart.Api.Domain;
using Microsoft.Extensions.Caching.Distributed;

namespace Cart.Api.Infrastructure;

public class RedisCartStore(IDistributedCache cache) : ICartStore
{
    private readonly IDistributedCache _cache = cache;

    public async Task<IList<CartItem>> GetCartAsync(string userId)
    {
        var data = await _cache.GetStringAsync(Key(userId));
        if (data is null) return new List<CartItem>();
        return JsonSerializer.Deserialize<IList<CartItem>>(data) ?? new List<CartItem>();
    }

    public async Task SetCartAsync(string userId, IList<CartItem> items)
    {
        var data = JsonSerializer.Serialize(items);
        await _cache.SetStringAsync(Key(userId), data);
    }

    public async Task ClearCartAsync(string userId)
    {
        await _cache.RemoveAsync(Key(userId));
    }

    private static string Key(string userId) => $"cart:{userId}";
}
