using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using Catalog.Api.Contracts;

namespace Catalog.Api.Infrastructure;

public sealed class ProductCenterStore
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, BrandDto>> _brandsByTenant =
        new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, AttributeTemplateDto>> _templatesByTenant =
        new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, SpuConstraintDto>> _constraintsByTenant =
        new(StringComparer.OrdinalIgnoreCase);

    public IReadOnlyList<BrandDto> ListBrands(string tenantId, bool activeOnly = false)
    {
        var tenant = NormalizeTenant(tenantId);
        if (!_brandsByTenant.TryGetValue(tenant, out var map))
        {
            return [];
        }

        var values = map.Values.AsEnumerable();
        if (activeOnly)
        {
            values = values.Where(item => item.IsActive);
        }
        return values.OrderBy(item => item.Code, StringComparer.OrdinalIgnoreCase).ToList();
    }

    public BrandDto CreateBrand(string tenantId, string code, string name, bool isActive)
    {
        var tenant = NormalizeTenant(tenantId);
        var normalizedCode = NormalizeCode(code);
        var normalizedName = name.Trim();
        if (string.IsNullOrWhiteSpace(normalizedName))
        {
            throw new ArgumentException("brand name cannot be empty");
        }

        var now = DateTime.UtcNow;
        var created = new BrandDto(normalizedCode, normalizedName, isActive, now, now);
        var map = _brandsByTenant.GetOrAdd(tenant, _ => new ConcurrentDictionary<string, BrandDto>(StringComparer.OrdinalIgnoreCase));
        if (!map.TryAdd(normalizedCode, created))
        {
            throw new InvalidOperationException($"brand already exists: {normalizedCode}");
        }

        return created;
    }

    public IReadOnlyList<AttributeTemplateDto> ListTemplates(string tenantId, string? categoryPath = null)
    {
        var tenant = NormalizeTenant(tenantId);
        if (!_templatesByTenant.TryGetValue(tenant, out var map))
        {
            return [];
        }

        var normalizedCategory = NormalizePathNullable(categoryPath);
        var values = map.Values.AsEnumerable();
        if (normalizedCategory is not null)
        {
            values = values.Where(item =>
                string.Equals(item.CategoryPath, normalizedCategory, StringComparison.OrdinalIgnoreCase) ||
                item.CategoryPath.StartsWith(normalizedCategory + "/", StringComparison.OrdinalIgnoreCase));
        }
        return values.OrderBy(item => item.Code, StringComparer.OrdinalIgnoreCase).ToList();
    }

    public AttributeTemplateDto CreateTemplate(
        string tenantId,
        string code,
        string name,
        string categoryPath,
        List<AttributeDefinitionDto> attributes)
    {
        var tenant = NormalizeTenant(tenantId);
        var normalizedCode = NormalizeCode(code);
        var normalizedName = name.Trim();
        if (string.IsNullOrWhiteSpace(normalizedName))
        {
            throw new ArgumentException("template name cannot be empty");
        }

        var normalizedCategory = NormalizePath(categoryPath);
        var normalizedAttributes = NormalizeAttributeDefinitions(attributes);
        var now = DateTime.UtcNow;
        var created = new AttributeTemplateDto(
            normalizedCode,
            normalizedName,
            normalizedCategory,
            normalizedAttributes,
            now,
            now);
        var map = _templatesByTenant.GetOrAdd(tenant, _ => new ConcurrentDictionary<string, AttributeTemplateDto>(StringComparer.OrdinalIgnoreCase));
        if (!map.TryAdd(normalizedCode, created))
        {
            throw new InvalidOperationException($"template already exists: {normalizedCode}");
        }

        return created;
    }

    public SpuConstraintDto UpsertConstraint(
        string tenantId,
        string categoryPath,
        List<string> requiredAttributes,
        List<string> variantAttributes)
    {
        var tenant = NormalizeTenant(tenantId);
        var normalizedCategory = NormalizePath(categoryPath);
        var required = NormalizeKeys(requiredAttributes);
        var variant = NormalizeKeys(variantAttributes);
        var now = DateTime.UtcNow;
        var value = new SpuConstraintDto(normalizedCategory, required, variant, now);
        var map = _constraintsByTenant.GetOrAdd(tenant, _ => new ConcurrentDictionary<string, SpuConstraintDto>(StringComparer.OrdinalIgnoreCase));
        map[normalizedCategory] = value;
        return value;
    }

    public bool TryGetConstraint(string tenantId, string categoryPath, out SpuConstraintDto value)
    {
        var tenant = NormalizeTenant(tenantId);
        var normalizedCategory = NormalizePath(categoryPath);
        value = default!;
        if (!_constraintsByTenant.TryGetValue(tenant, out var map))
        {
            return false;
        }
        if (!map.TryGetValue(normalizedCategory, out var found) || found is null)
        {
            return false;
        }
        value = found;
        return true;
    }

    public SpuValidationResultDto Validate(string tenantId, string categoryPath, List<SkuSpecDto> skus)
    {
        if (!TryGetConstraint(tenantId, categoryPath, out var constraint))
        {
            throw new KeyNotFoundException($"constraint not found: {categoryPath}");
        }

        var errors = new List<string>();
        var missingRequired = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var duplicateVariants = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var variantSignatures = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < skus.Count; i++)
        {
            var attrs = skus[i].Attributes ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var key in constraint.RequiredAttributes)
            {
                if (!attrs.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value))
                {
                    missingRequired.Add(key);
                }
            }

            if (constraint.VariantAttributes.Count > 0)
            {
                var parts = new List<string>();
                var hasAllKeys = true;
                foreach (var key in constraint.VariantAttributes)
                {
                    if (!attrs.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value))
                    {
                        hasAllKeys = false;
                        missingRequired.Add(key);
                        break;
                    }
                    parts.Add($"{key}={value.Trim()}");
                }

                if (hasAllKeys)
                {
                    var signature = string.Join("|", parts);
                    if (!variantSignatures.Add(signature))
                    {
                        duplicateVariants.Add(signature);
                    }
                }
            }
        }

        if (skus.Count == 0)
        {
            errors.Add("at least one sku spec is required");
        }

        if (missingRequired.Count > 0)
        {
            errors.Add("required attributes missing");
        }
        if (duplicateVariants.Count > 0)
        {
            errors.Add("variant attribute combination must be unique");
        }

        return new SpuValidationResultDto(
            IsValid: errors.Count == 0,
            MissingRequiredAttributes: missingRequired.OrderBy(item => item, StringComparer.OrdinalIgnoreCase).ToList(),
            DuplicateVariantKeys: duplicateVariants.OrderBy(item => item, StringComparer.OrdinalIgnoreCase).ToList(),
            Errors: errors);
    }

    private static string NormalizeTenant(string tenantId)
    {
        return string.IsNullOrWhiteSpace(tenantId) ? "public" : tenantId.Trim().ToLowerInvariant();
    }

    private static string NormalizeCode(string input)
    {
        var normalized = input.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("code cannot be empty");
        }
        return normalized;
    }

    private static string NormalizePath(string input)
    {
        var normalized = input.Trim().Trim('/').ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("category path cannot be empty");
        }
        return normalized;
    }

    private static string? NormalizePathNullable(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return null;
        }
        return NormalizePath(input);
    }

    private static List<string> NormalizeKeys(List<string> values)
    {
        return values
            .Select(item => item?.Trim().ToLowerInvariant() ?? "")
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(item => item, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static List<AttributeDefinitionDto> NormalizeAttributeDefinitions(List<AttributeDefinitionDto> attributes)
    {
        var list = attributes ?? [];
        if (list.Count == 0)
        {
            throw new ArgumentException("template attributes cannot be empty");
        }

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var normalized = new List<AttributeDefinitionDto>();
        foreach (var item in list)
        {
            var key = item.Key.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(key))
            {
                throw new ArgumentException("attribute key cannot be empty");
            }
            if (!seen.Add(key))
            {
                throw new ArgumentException($"duplicate attribute key: {key}");
            }

            var label = item.Label.Trim();
            if (string.IsNullOrWhiteSpace(label))
            {
                throw new ArgumentException($"attribute label cannot be empty: {key}");
            }

            var type = string.IsNullOrWhiteSpace(item.DataType) ? "text" : item.DataType.Trim().ToLowerInvariant();
            normalized.Add(new AttributeDefinitionDto(key, label, item.Required, type));
        }

        return normalized;
    }
}
