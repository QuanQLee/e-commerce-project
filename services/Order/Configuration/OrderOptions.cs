using System.ComponentModel.DataAnnotations;
using System.Linq;

namespace Order.Configuration;

public sealed class OrderOptions
{
    public const string SectionName = "Order";

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
