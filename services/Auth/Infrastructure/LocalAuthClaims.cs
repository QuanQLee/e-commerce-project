using System.Collections.Generic;
using System.Security.Claims;

namespace Auth.Infrastructure;

public static class LocalAuthClaims
{
    public static IReadOnlyList<Claim> CreateAdditionalClaims(LocalAuthUser user)
    {
        var claims = new List<Claim>
        {
            new("preferred_username", user.Username),
            new("name", string.IsNullOrWhiteSpace(user.DisplayName) ? user.Username : user.DisplayName),
        };

        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            claims.Add(new Claim("email", user.Email));
        }

        return claims;
    }
}
