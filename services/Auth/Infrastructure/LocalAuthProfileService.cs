using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Services;

namespace Auth.Infrastructure;

public sealed class LocalAuthProfileService : IProfileService
{
    private readonly LocalAuthUserStore _userStore;

    public LocalAuthProfileService(LocalAuthUserStore userStore)
    {
        _userStore = userStore;
    }

    public async Task GetProfileDataAsync(ProfileDataRequestContext context)
    {
        var subjectId = context.Subject?.FindFirst("sub")?.Value;
        if (string.IsNullOrWhiteSpace(subjectId))
        {
            context.IssuedClaims = new List<Claim>();
            return;
        }

        var user = await _userStore.FindBySubjectIdAsync(subjectId);
        if (user is null || !user.IsActive)
        {
            context.IssuedClaims = new List<Claim>();
            return;
        }

        var issuedClaims = LocalAuthClaims.CreateAdditionalClaims(user).ToList();
        if (context.RequestedClaimTypes is not null && context.RequestedClaimTypes.Any())
        {
            issuedClaims = issuedClaims
                .Where(claim => context.RequestedClaimTypes.Contains(claim.Type))
                .ToList();
        }

        context.IssuedClaims = issuedClaims;
    }

    public async Task IsActiveAsync(IsActiveContext context)
    {
        var subjectId = context.Subject?.FindFirst("sub")?.Value;
        if (string.IsNullOrWhiteSpace(subjectId))
        {
            context.IsActive = false;
            return;
        }

        var user = await _userStore.FindBySubjectIdAsync(subjectId);
        context.IsActive = user?.IsActive == true;
    }
}
