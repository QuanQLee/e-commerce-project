using Microsoft.AspNetCore.Mvc;
using Shipping.Api.Controllers;

namespace Shipping.Tests;

public class ShipmentsControllerTests
{
    [Fact]
    public void CalculateRate_ReturnsStructuredStrategyResult()
    {
        var controller = new ShipmentsController(null!, null!);
        var result = controller.CalculateRate(new ShipmentsController.RateRequest(2m, "CN", true));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<ShipmentsController.RateResponse>(ok.Value);

        Assert.Equal("express", payload.ServiceLevel);
        Assert.True(payload.Fee > 0);
        Assert.True(payload.EstimatedDays >= 1);
        Assert.False(string.IsNullOrWhiteSpace(payload.Carrier));
    }
}
