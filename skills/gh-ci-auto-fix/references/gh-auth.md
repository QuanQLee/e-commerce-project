# GitHub CLI Auth Notes

Use `gh auth status` to confirm the host is authenticated and that the token has `repo` and `workflow` scopes.

If unauthenticated or missing scopes:
- Run `gh auth login` and select the GitHub.com host.
- Ensure the token includes `repo` and `workflow` scopes.

To verify the current user:
- `gh api user --jq .login`
