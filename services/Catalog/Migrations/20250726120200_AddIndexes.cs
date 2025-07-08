using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Migrations;

public partial class AddIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateIndex(
            name: "IX_products_Name",
            schema: "catalog",
            table: "products",
            column: "Name");

        migrationBuilder.CreateIndex(
            name: "IX_products_Category",
            schema: "catalog",
            table: "products",
            column: "Category");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_products_Name",
            schema: "catalog",
            table: "products");

        migrationBuilder.DropIndex(
            name: "IX_products_Category",
            schema: "catalog",
            table: "products");
    }
}
