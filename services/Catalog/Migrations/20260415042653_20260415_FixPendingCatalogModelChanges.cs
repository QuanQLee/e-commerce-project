using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Migrations
{
    /// <inheritdoc />
    public partial class _20260415_FixPendingCatalogModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE TABLE IF NOT EXISTS catalog.product_skus (
                    "Id" uuid NOT NULL,
                    "ProductId" uuid NOT NULL,
                    "Code" character varying(120) NOT NULL,
                    "Price" numeric(12,2) NOT NULL,
                    "Stock" integer NOT NULL,
                    "AttributesJson" jsonb NOT NULL DEFAULT '{}'::jsonb,
                    "IsActive" boolean NOT NULL DEFAULT TRUE,
                    "CreatedAtUtc" timestamp with time zone NOT NULL,
                    "UpdatedAtUtc" timestamp with time zone NOT NULL,
                    CONSTRAINT "PK_product_skus" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_product_skus_products_ProductId"
                        FOREIGN KEY ("ProductId") REFERENCES catalog.products ("Id") ON DELETE CASCADE
                );
                """
            );

            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'catalog'
                          AND table_name = 'products'
                          AND column_name = 'TenantId'
                    ) THEN
                        ALTER TABLE catalog.products
                            ADD COLUMN "TenantId" character varying(80) NOT NULL DEFAULT 'public';
                    END IF;
                END $$;
                """
            );

            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'catalog'
                          AND table_name = 'product_skus'
                          AND column_name = 'TenantId'
                    ) THEN
                        ALTER TABLE catalog.product_skus
                            ADD COLUMN "TenantId" character varying(80) NOT NULL DEFAULT 'public';
                    END IF;
                END $$;
                """
            );

            migrationBuilder.Sql(
                """
                CREATE INDEX IF NOT EXISTS "IX_products_TenantId"
                    ON catalog.products ("TenantId");
                CREATE INDEX IF NOT EXISTS "IX_product_skus_ProductId"
                    ON catalog.product_skus ("ProductId");
                CREATE INDEX IF NOT EXISTS "IX_product_skus_TenantId"
                    ON catalog.product_skus ("TenantId");
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_product_skus_TenantId_ProductId_Code"
                    ON catalog.product_skus ("TenantId", "ProductId", "Code");
                """
            );

            migrationBuilder.Sql("""UPDATE catalog.products SET "Description" = '' WHERE "Description" IS NULL;""");
            migrationBuilder.Sql("""UPDATE catalog.product_skus SET "AttributesJson" = '{}'::jsonb WHERE "AttributesJson" IS NULL;""");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "catalog",
                table: "products",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AttributesJson",
                schema: "catalog",
                table: "product_skus",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'{}'::jsonb",
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldNullable: true,
                oldDefaultValueSql: "'{}'::jsonb");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "catalog",
                table: "products",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AlterColumn<string>(
                name: "AttributesJson",
                schema: "catalog",
                table: "product_skus",
                type: "jsonb",
                nullable: true,
                defaultValueSql: "'{}'::jsonb",
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldDefaultValueSql: "'{}'::jsonb");
        }
    }
}
