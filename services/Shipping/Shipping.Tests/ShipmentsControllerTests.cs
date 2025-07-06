using Microsoft.AspNetCore.Mvc;
using Shipping.Api.Controllers;

namespace Shipping.Tests;

public class ShipmentsControllerTests
{
    [Fact]
    public void CalculateRate_ReturnsExpectedValue()
    {
        var controller = new ShipmentsController(null!, null!);
        var result = controller.CalculateRate(new ShipmentsController.RateRequest(2m, "US"));
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(2m * 1.25m, ok.Value);
    }
}
