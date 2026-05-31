using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Migrations;

public partial class AddProductSkus : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "product_skus",
            schema: "catalog",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                Code = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                Price = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                Stock = table.Column<int>(type: "integer", nullable: false),
                AttributesJson = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_product_skus", x => x.Id);
                table.ForeignKey(
                    name: "FK_product_skus_products_ProductId",
                    column: x => x.ProductId,
                    principalSchema: "catalog",
                    principalTable: "products",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_product_skus_ProductId",
            schema: "catalog",
            table: "product_skus",
            column: "ProductId");

        migrationBuilder.CreateIndex(
            name: "IX_product_skus_ProductId_Code",
            schema: "catalog",
            table: "product_skus",
            columns: new[] { "ProductId", "Code" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "product_skus",
            schema: "catalog");
    }
}
