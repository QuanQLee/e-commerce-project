using System.Collections.Generic;
using System;

namespace Catalog.Api.Contracts;

public record CreateSkuDto(
    string Code,
    decimal Price,
    int Stock,
    Dictionary<string, string>? Attributes = null);

public record UpdateSkuDto(
    string Code,
    decimal Price,
    int Stock,
    Dictionary<string, string>? Attributes = null);

public record UpdateSkuStatusDto(bool IsActive);

public record ProductSkuDto(
    Guid Id,
    Guid ProductId,
    string Code,
    decimal Price,
    int Stock,
    Dictionary<string, string> Attributes,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public record BatchCreateSkusDto(List<CreateSkuDto> Items);

public record BatchSkuErrorDto(int Index, string Code, string Error);

public record BatchCreateSkusResultDto(
    int Requested,
    int Created,
    int Skipped,
    List<BatchSkuErrorDto> Errors);

public record BatchUpdateSkuItemDto(
    string Code,
    decimal? Price = null,
    int? Stock = null,
    bool? IsActive = null);

public record BatchUpdateSkusDto(List<BatchUpdateSkuItemDto> Items);

public record BatchUpdateSkusResultDto(
    int Requested,
    int Updated,
    int NotFound,
    List<BatchSkuErrorDto> Errors);
