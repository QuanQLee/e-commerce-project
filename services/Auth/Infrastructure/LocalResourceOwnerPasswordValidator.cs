using System.Threading.Tasks;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Validation;

namespace Auth.Infrastructure;

public sealed class LocalResourceOwnerPasswordValidator : IResourceOwnerPasswordValidator
{
    private readonly LocalAuthUserStore _userStore;

    public LocalResourceOwnerPasswordValidator(LocalAuthUserStore userStore)
    {
        _userStore = userStore;
    }

    public async Task ValidateAsync(ResourceOwnerPasswordValidationContext context)
    {
        var user = await _userStore.ValidateCredentialsAsync(
            context.UserName,
            context.Password);

        if (user is null)
        {
            context.Result = new GrantValidationResult(
                TokenRequestErrors.InvalidGrant,
                "Invalid username or password.");
            return;
        }

        context.Result = new GrantValidationResult(
            user.SubjectId,
            "password",
            LocalAuthClaims.CreateAdditionalClaims(user));
    }
}
