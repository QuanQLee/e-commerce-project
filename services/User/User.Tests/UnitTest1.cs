using User.Api.Domain;

namespace User.Tests;

public class UserEntityTests
{
    [Fact]
    public void CreatedUser_HasIdAndDate()
    {
        var user = new UserEntity { UserName = "u", Email = "e" };
        Assert.NotEqual(Guid.Empty, user.Id);
        Assert.True(user.CreatedAt <= DateTime.UtcNow);
    }
}
