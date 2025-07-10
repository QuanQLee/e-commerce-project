using Catalog.Api.Domain;

namespace Catalog.Tests;

public class ProductTests
{
    [Fact]
    public void Update_SetsProperties()
    {
        var product = new Product();
        product.Update("Phone", "Smart device", 199m);

        Assert.Equal("Phone", product.Name);
        Assert.Equal("Smart device", product.Description);
        Assert.Equal(199m, product.Price);
    }
}

