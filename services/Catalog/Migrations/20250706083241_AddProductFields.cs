using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Migrations
{
    /// <inheritdoc />
    public partial class AddProductFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
        migrationBuilder.AddColumn<string>(
            name: "ImageUrl",
            schema: "catalog",
            table: "products",
            type: "character varying(500)",
            maxLength: 500,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Category",
            schema: "catalog",
            table: "products",
            type: "character varying(200)",
            maxLength: 200,
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<int>(
            name: "Stock",
            schema: "catalog",
            table: "products",
            type: "integer",
            nullable: false,
            defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        migrationBuilder.DropColumn(
            name: "ImageUrl",
            schema: "catalog",
            table: "products");

        migrationBuilder.DropColumn(
            name: "Category",
            schema: "catalog",
            table: "products");

        migrationBuilder.DropColumn(
            name: "Stock",
            schema: "catalog",
            table: "products");
        }
    }
}
