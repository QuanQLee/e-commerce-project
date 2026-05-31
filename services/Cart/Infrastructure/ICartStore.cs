using System.Collections.Generic;
using System.Threading.Tasks;
using Cart.Api.Domain;

namespace Cart.Api.Infrastructure;

public interface ICartStore
{
    Task<IList<CartItem>> GetCartAsync(string tenantId, string userId);
    Task SetCartAsync(string tenantId, string userId, IList<CartItem> items);
    Task ClearCartAsync(string tenantId, string userId);
}

