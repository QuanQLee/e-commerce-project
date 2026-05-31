using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order.Api.Controllers;
using Order.Api.Domain;
using Order.Api.Infrastructure;

namespace Order.Tests;

public class OrdersControllerTests
{
    [Fact]
    public async Task Create_AssignsTenantFromHeader()
    {
        var options = new DbContextOptionsBuilder<OrderDbContext>()
            .UseInMemoryDatabase($"order-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new OrderDbContext(options);
        var controller = new OrdersController(db)
        {
            ControllerContext = BuildContext("tenant-a")
        };

        var result = await controller.Create(
            new OrdersController.CreateOrderDto(
                Guid.NewGuid(),
                new List<OrdersController.CreateOrderItemDto>
                {
                    new("Phone", 100m)
                },
                100m
            )
        );

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.NotEqual(Guid.Empty, (Guid)created.Value!);

        var order = await db.Orders.Include(o => o.Items).SingleAsync();
        Assert.Equal("tenant-a", order.TenantId);
        Assert.Single(order.Items);
        Assert.Equal("tenant-a", order.Items[0].TenantId);
    }

    [Fact]
    public async Task Create_UsesCurrentUserHeaderOverRequestBody()
    {
        var options = new DbContextOptionsBuilder<OrderDbContext>()
            .UseInMemoryDatabase($"order-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new OrderDbContext(options);
        var currentUserId = Guid.NewGuid();
        var controller = new OrdersController(db)
        {
            ControllerContext = BuildContext("tenant-a", currentUserId)
        };

        var result = await controller.Create(
            new OrdersController.CreateOrderDto(
                Guid.NewGuid(),
                new List<OrdersController.CreateOrderItemDto>
                {
                    new("Phone", 100m)
                },
                100m
            )
        );

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.NotEqual(Guid.Empty, (Guid)created.Value!);

        var order = await db.Orders.SingleAsync();
        Assert.Equal(currentUserId, order.UserId);
    }

    [Fact]
    public async Task GetAll_FiltersOrdersByTenant()
    {
        var options = new DbContextOptionsBuilder<OrderDbContext>()
            .UseInMemoryDatabase($"order-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new OrderDbContext(options);

        var tenantAOrder = new OrderEntity { UserId = Guid.NewGuid() };
        tenantAOrder.AssignTenant("tenant-a");
        tenantAOrder.AddItem("Phone", 100m);

        var tenantBOrder = new OrderEntity { UserId = Guid.NewGuid() };
        tenantBOrder.AssignTenant("tenant-b");
        tenantBOrder.AddItem("Tablet", 200m);

        db.Orders.AddRange(tenantAOrder, tenantBOrder);
        await db.SaveChangesAsync();

        var controller = new OrdersController(db)
        {
            ControllerContext = BuildContext("tenant-a")
        };

        var result = await controller.GetAll();

        var orders = Assert.IsType<List<OrderEntity>>(result.Value);
        Assert.Single(orders);
        Assert.Equal("tenant-a", orders[0].TenantId);
        Assert.Single(orders[0].Items);
        Assert.Equal("tenant-a", orders[0].Items[0].TenantId);
    }

    [Fact]
    public async Task GetAll_FiltersOrdersByTenantAndUserId_WhenUserIdProvided()
    {
        var options = new DbContextOptionsBuilder<OrderDbContext>()
            .UseInMemoryDatabase($"order-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new OrderDbContext(options);

        var targetUserId = Guid.NewGuid();

        var matchingOrder = new OrderEntity { UserId = targetUserId };
        matchingOrder.AssignTenant("tenant-a");
        matchingOrder.AddItem("Phone", 100m);

        var otherUserOrder = new OrderEntity { UserId = Guid.NewGuid() };
        otherUserOrder.AssignTenant("tenant-a");
        otherUserOrder.AddItem("Tablet", 200m);

        var otherTenantOrder = new OrderEntity { UserId = targetUserId };
        otherTenantOrder.AssignTenant("tenant-b");
        otherTenantOrder.AddItem("Headphones", 50m);

        db.Orders.AddRange(matchingOrder, otherUserOrder, otherTenantOrder);
        await db.SaveChangesAsync();

        var controller = new OrdersController(db)
        {
            ControllerContext = BuildContext("tenant-a")
        };

        var result = await controller.GetAll(targetUserId);

        var orders = Assert.IsType<List<OrderEntity>>(result.Value);
        Assert.Single(orders);
        Assert.Equal(targetUserId, orders[0].UserId);
        Assert.Equal("tenant-a", orders[0].TenantId);
    }

    [Fact]
    public async Task GetAll_PrefersCurrentUserHeaderOverQueryParameter()
    {
        var options = new DbContextOptionsBuilder<OrderDbContext>()
            .UseInMemoryDatabase($"order-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new OrderDbContext(options);

        var currentUserId = Guid.NewGuid();

        var matchingOrder = new OrderEntity { UserId = currentUserId };
        matchingOrder.AssignTenant("tenant-a");
        matchingOrder.AddItem("Phone", 100m);

        var spoofedOrder = new OrderEntity { UserId = Guid.NewGuid() };
        spoofedOrder.AssignTenant("tenant-a");
        spoofedOrder.AddItem("Tablet", 200m);

        db.Orders.AddRange(matchingOrder, spoofedOrder);
        await db.SaveChangesAsync();

        var controller = new OrdersController(db)
        {
            ControllerContext = BuildContext("tenant-a", currentUserId)
        };

        var result = await controller.GetAll(Guid.NewGuid());

        var orders = Assert.IsType<List<OrderEntity>>(result.Value);
        Assert.Single(orders);
        Assert.Equal(currentUserId, orders[0].UserId);
    }

    [Fact]
    public async Task Get_ReturnsNotFoundForDifferentCurrentUser()
    {
        var options = new DbContextOptionsBuilder<OrderDbContext>()
            .UseInMemoryDatabase($"order-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new OrderDbContext(options);

        var order = new OrderEntity { UserId = Guid.NewGuid() };
        order.AssignTenant("tenant-a");
        order.AddItem("Phone", 100m);
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var controller = new OrdersController(db)
        {
            ControllerContext = BuildContext("tenant-a", Guid.NewGuid())
        };

        var result = await controller.Get(order.Id);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task UpdateStatus_ReturnsNotFoundForDifferentTenant()
    {
        var options = new DbContextOptionsBuilder<OrderDbContext>()
            .UseInMemoryDatabase($"order-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new OrderDbContext(options);

        var order = new OrderEntity { UserId = Guid.NewGuid() };
        order.AssignTenant("tenant-a");
        order.AddItem("Phone", 100m);
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var controller = new OrdersController(db)
        {
            ControllerContext = BuildContext("tenant-b")
        };

        var result = await controller.UpdateStatus(
            order.Id,
            new OrdersController.UpdateStatusDto(OrderStatus.Paid)
        );

        Assert.IsType<NotFoundResult>(result);
        Assert.Equal(OrderStatus.PendingPayment, (await db.Orders.SingleAsync()).Status);
    }

    private static ControllerContext BuildContext(string tenantId, Guid? userId = null)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-Tenant-Id"] = tenantId;
        if (userId.HasValue)
        {
            httpContext.Request.Headers["X-User-Id"] = userId.Value.ToString();
        }
        return new ControllerContext
        {
            HttpContext = httpContext
        };
    }
}
