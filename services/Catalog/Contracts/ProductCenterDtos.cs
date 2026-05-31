using System.Collections.Generic;
using System;

namespace Catalog.Api.Contracts;

public record CreateBrandDto(string Code, string Name, bool IsActive = true);

public record BrandDto(
    string Code,
    string Name,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public record AttributeDefinitionDto(
    string Key,
    string Label,
    bool Required = false,
    string DataType = "text");

public record CreateAttributeTemplateDto(
    string Code,
    string Name,
    string CategoryPath,
    List<AttributeDefinitionDto> Attributes);

public record AttributeTemplateDto(
    string Code,
    string Name,
    string CategoryPath,
    List<AttributeDefinitionDto> Attributes,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public record UpsertSpuConstraintDto(
    string CategoryPath,
    List<string> RequiredAttributes,
    List<string> VariantAttributes);

public record SpuConstraintDto(
    string CategoryPath,
    List<string> RequiredAttributes,
    List<string> VariantAttributes,
    DateTime UpdatedAtUtc);

public record SkuSpecDto(Dictionary<string, string> Attributes);

public record ValidateSpuSpecsDto(List<SkuSpecDto> Skus);

public record SpuValidationResultDto(
    bool IsValid,
    List<string> MissingRequiredAttributes,
    List<string> DuplicateVariantKeys,
    List<string> Errors);
