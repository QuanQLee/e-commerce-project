using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Shipping.Api.Infrastructure;

namespace Shipping.Api.Jobs;

public class CheckPendingShipmentsJob(ShippingDbContext db)
{
    public async Task Run()
    {
        var count = await db.Shipments.CountAsync(s => s.Status == "Created");
        Console.WriteLine($"Pending shipments: {count}");
    }
}
