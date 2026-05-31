using Catalog.Api.Contracts;
using Catalog.Api.Infrastructure;

namespace Catalog.Tests;

public class ProductCenterStoreTests
{
    [Fact]
    public void Brand_Template_And_SpuConstraint_Workflow_Works()
    {
        var store = new ProductCenterStore();

        var brand = store.CreateBrand("tenant-a", "apple", "Apple", true);
        Assert.Equal("apple", brand.Code);
        Assert.Single(store.ListBrands("tenant-a"));

        var template = store.CreateTemplate(
            "tenant-a",
            "phone_base",
            "Phone Base",
            "electronics/phones",
            [
                new AttributeDefinitionDto("color", "Color", true),
                new AttributeDefinitionDto("storage", "Storage", true),
            ]);
        Assert.Equal("phone_base", template.Code);
        Assert.Single(store.ListTemplates("tenant-a", "electronics"));

        var constraint = store.UpsertConstraint(
            "tenant-a",
            "electronics/phones",
            ["color", "storage"],
            ["color", "storage"]);
        Assert.Equal(2, constraint.RequiredAttributes.Count);

        var valid = store.Validate(
            "tenant-a",
            "electronics/phones",
            [
                new SkuSpecDto(new Dictionary<string, string> { ["color"] = "black", ["storage"] = "128g" }),
                new SkuSpecDto(new Dictionary<string, string> { ["color"] = "black", ["storage"] = "256g" }),
            ]);
        Assert.True(valid.IsValid);

        var invalid = store.Validate(
            "tenant-a",
            "electronics/phones",
            [
                new SkuSpecDto(new Dictionary<string, string> { ["color"] = "black" }),
                new SkuSpecDto(new Dictionary<string, string> { ["color"] = "black", ["storage"] = "128g" }),
                new SkuSpecDto(new Dictionary<string, string> { ["color"] = "black", ["storage"] = "128g" }),
            ]);
        Assert.False(invalid.IsValid);
        Assert.Contains("storage", invalid.MissingRequiredAttributes);
        Assert.NotEmpty(invalid.DuplicateVariantKeys);
    }
}
