namespace Catalog.Api.Contracts;

public record CreateCategoryDto(
    string Path,
    string Name,
    string? ParentPath = null,
    bool IsActive = true);

public record CategoryStatusDto(bool IsActive);

public record UpdateCategoryStatusDto(string Path, bool IsActive);
