using Catalog.Api.Infrastructure;

namespace Catalog.Tests;

public class CategoryStoreTests
{
    [Fact]
    public void Create_And_UpdateStatus_Works()
    {
        var store = new CategoryStore();

        var root = store.Create("electronics", "Electronics", null, true);
        var child = store.Create("electronics/phones", "Phones", "electronics", true);

        Assert.Equal("electronics", root.Path);
        Assert.Equal("electronics", child.ParentPath);

        var updated = store.SetStatus("electronics/phones", false);
        Assert.False(updated.IsActive);
        Assert.Single(store.List(activeOnly: true));
    }
}
