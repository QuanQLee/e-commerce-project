using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Cart.Api.Domain;
using Microsoft.Extensions.Caching.Distributed;

namespace Cart.Api.Infrastructure;

public class RedisCartStore(IDistributedCache cache) : ICartStore
{
    private readonly IDistributedCache _cache = cache;

    public async Task<IList<CartItem>> GetCartAsync(string tenantId, string userId)
    {
        var data = await _cache.GetStringAsync(Key(tenantId, userId));
        if (data is null) return new List<CartItem>();
        return JsonSerializer.Deserialize<IList<CartItem>>(data) ?? new List<CartItem>();
    }

    public async Task SetCartAsync(string tenantId, string userId, IList<CartItem> items)
    {
        var data = JsonSerializer.Serialize(items);
        await _cache.SetStringAsync(Key(tenantId, userId), data);
    }

    public async Task ClearCartAsync(string tenantId, string userId)
    {
        await _cache.RemoveAsync(Key(tenantId, userId));
    }

    private static string Key(string tenantId, string userId)
    {
        var normalizedTenantId = string.IsNullOrWhiteSpace(tenantId) ? "public" : tenantId.Trim();
        return $"cart:{normalizedTenantId}:{userId}";
    }
}

