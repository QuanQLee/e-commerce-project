using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Migrations;

public partial class AddTenantIsolation : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "TenantId",
            schema: "catalog",
            table: "products",
            type: "character varying(80)",
            maxLength: 80,
            nullable: false,
            defaultValue: "public");

        migrationBuilder.AddColumn<string>(
            name: "TenantId",
            schema: "catalog",
            table: "product_skus",
            type: "character varying(80)",
            maxLength: 80,
            nullable: false,
            defaultValue: "public");

        migrationBuilder.CreateIndex(
            name: "IX_products_TenantId",
            schema: "catalog",
            table: "products",
            column: "TenantId");

        migrationBuilder.CreateIndex(
            name: "IX_product_skus_TenantId",
            schema: "catalog",
            table: "product_skus",
            column: "TenantId");

        migrationBuilder.DropIndex(
            name: "IX_product_skus_ProductId_Code",
            schema: "catalog",
            table: "product_skus");

        migrationBuilder.CreateIndex(
            name: "IX_product_skus_TenantId_ProductId_Code",
            schema: "catalog",
            table: "product_skus",
            columns: new[] { "TenantId", "ProductId", "Code" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_products_TenantId",
            schema: "catalog",
            table: "products");

        migrationBuilder.DropIndex(
            name: "IX_product_skus_TenantId",
            schema: "catalog",
            table: "product_skus");

        migrationBuilder.DropIndex(
            name: "IX_product_skus_TenantId_ProductId_Code",
            schema: "catalog",
            table: "product_skus");

        migrationBuilder.CreateIndex(
            name: "IX_product_skus_ProductId_Code",
            schema: "catalog",
            table: "product_skus",
            columns: new[] { "ProductId", "Code" },
            unique: true);

        migrationBuilder.DropColumn(
            name: "TenantId",
            schema: "catalog",
            table: "products");

        migrationBuilder.DropColumn(
            name: "TenantId",
            schema: "catalog",
            table: "product_skus");
    }
}
