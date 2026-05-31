using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;

namespace Catalog.Api.Infrastructure;

public record CategoryItem(
    string Path,
    string Name,
    string? ParentPath,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed class CategoryStore
{
    private readonly ConcurrentDictionary<string, CategoryItem> _categories =
        new(StringComparer.OrdinalIgnoreCase);

    public IReadOnlyList<CategoryItem> List(bool activeOnly = false)
    {
        var values = _categories.Values;
        if (activeOnly)
        {
            values = values.Where(c => c.IsActive).ToArray();
        }

        return values.OrderBy(c => c.Path, StringComparer.OrdinalIgnoreCase).ToList();
    }

    public CategoryItem Create(string path, string name, string? parentPath, bool isActive)
    {
        var normalizedPath = Normalize(path);
        var normalizedParent = NormalizeNullable(parentPath);
        var now = DateTime.UtcNow;

        if (normalizedParent is not null && !_categories.ContainsKey(normalizedParent))
        {
            throw new InvalidOperationException($"parent category does not exist: {normalizedParent}");
        }

        var category = new CategoryItem(
            normalizedPath,
            name.Trim(),
            normalizedParent,
            isActive,
            now,
            now);

        if (!_categories.TryAdd(normalizedPath, category))
        {
            throw new InvalidOperationException($"category already exists: {normalizedPath}");
        }

        return category;
    }

    public bool TryGet(string path, out CategoryItem category)
    {
        return _categories.TryGetValue(Normalize(path), out category!);
    }

    public CategoryItem SetStatus(string path, bool isActive)
    {
        var key = Normalize(path);
        if (!_categories.TryGetValue(key, out var existing))
        {
            throw new KeyNotFoundException($"category not found: {key}");
        }

        var updated = existing with
        {
            IsActive = isActive,
            UpdatedAtUtc = DateTime.UtcNow,
        };
        _categories[key] = updated;
        return updated;
    }

    private static string Normalize(string value)
    {
        var normalized = value.Trim().Trim('/');
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("category path cannot be empty");
        }

        return normalized.ToLowerInvariant();
    }

    private static string? NormalizeNullable(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return Normalize(value);
    }
}
