using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using User.Api.Controllers;
using User.Api.Domain;
using User.Api.Infrastructure;

namespace User.Tests;

public class UsersControllerTests
{
    [Fact]
    public async Task Create_PersistsAuthSubjectId()
    {
        var options = new DbContextOptionsBuilder<UserDbContext>()
            .UseInMemoryDatabase($"user-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new UserDbContext(options);
        var controller = new UsersController(db);

        var result = await controller.Create(
            new UsersController.CreateUserDto(
                "user1",
                "user1@example.com",
                "tenant-a",
                "1001"
            )
        );

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.NotEqual(Guid.Empty, (Guid)created.Value!);

        var user = await db.Users.SingleAsync();
        Assert.Equal("1001", user.AuthSubjectId);
        Assert.Equal("tenant-a", user.TenantId);
    }

    [Fact]
    public async Task GetByAuthSubject_ReturnsUser()
    {
        var options = new DbContextOptionsBuilder<UserDbContext>()
            .UseInMemoryDatabase($"user-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new UserDbContext(options);
        db.Users.Add(
            new UserEntity
            {
                AuthSubjectId = "1001",
                UserName = "user1",
                Email = "user1@example.com",
                TenantId = "tenant-a",
            }
        );
        await db.SaveChangesAsync();

        var controller = new UsersController(db);

        var result = await controller.GetByAuthSubject("1001");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task GetByUsername_FiltersByTenant_WhenTenantIdProvided()
    {
        var options = new DbContextOptionsBuilder<UserDbContext>()
            .UseInMemoryDatabase($"user-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new UserDbContext(options);
        db.Users.AddRange(
            new UserEntity
            {
                AuthSubjectId = "1001",
                UserName = "user1",
                Email = "user1@example.com",
                TenantId = "tenant-a",
            },
            new UserEntity
            {
                AuthSubjectId = "1002",
                UserName = "user1",
                Email = "user1+tenant-b@example.com",
                TenantId = "tenant-b",
            }
        );
        await db.SaveChangesAsync();

        var controller = new UsersController(db);

        var result = await controller.GetByUsername("user1", "tenant-b");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(ok.Value);
        var payload = ok.Value!.ToString();
        Assert.Contains("tenant-b", payload);
        Assert.DoesNotContain("tenant-a", payload);
    }

    [Fact]
    public async Task GetByUsername_ReturnsConflict_WhenUsernameIsAmbiguousAcrossTenants()
    {
        var options = new DbContextOptionsBuilder<UserDbContext>()
            .UseInMemoryDatabase($"user-test-{Guid.NewGuid()}")
            .Options;
        await using var db = new UserDbContext(options);
        db.Users.AddRange(
            new UserEntity
            {
                AuthSubjectId = "2001",
                UserName = "shared-user",
                Email = "shared-user@tenant-a.example.com",
                TenantId = "tenant-a",
            },
            new UserEntity
            {
                AuthSubjectId = "2002",
                UserName = "shared-user",
                Email = "shared-user@tenant-b.example.com",
                TenantId = "tenant-b",
            }
        );
        await db.SaveChangesAsync();

        var controller = new UsersController(db);

        var result = await controller.GetByUsername("shared-user");

        var conflict = Assert.IsType<ConflictObjectResult>(result.Result);
        Assert.NotNull(conflict.Value);
    }
}
