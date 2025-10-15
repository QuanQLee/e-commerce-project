using System.ComponentModel.DataAnnotations;
using System.Linq;

namespace Catalog.Configuration;

public sealed class CatalogOptions
{
    public const string SectionName = "Catalog";

    [Required]
    [MinLength(1)]
    public string[] AllowedCorsOrigins { get; init; } =
    {
        "http://localhost:3000",
        "http://localhost:5173"
    };

    public bool UsesDefaultOrigins() =>
        AllowedCorsOrigins.Length == 2 &&
        AllowedCorsOrigins.Contains("http://localhost:3000") &&
        AllowedCorsOrigins.Contains("http://localhost:5173");
}
