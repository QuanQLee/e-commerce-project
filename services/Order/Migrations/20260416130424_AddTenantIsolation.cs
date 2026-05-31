using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Order.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantIsolation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "order"."orders"
                    ADD COLUMN IF NOT EXISTS "UserId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

                ALTER TABLE "order"."orders"
                    ADD COLUMN IF NOT EXISTS "CreatedAt" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc');

                ALTER TABLE "order"."orders"
                    ADD COLUMN IF NOT EXISTS "TenantId" character varying(80) NOT NULL DEFAULT 'public';

                ALTER TABLE "order"."order_items"
                    ADD COLUMN IF NOT EXISTS "TenantId" character varying(80) NOT NULL DEFAULT 'public';

                DROP INDEX IF EXISTS "order"."IX_orders_UserId_CreatedAt";

                CREATE INDEX IF NOT EXISTS "IX_orders_TenantId_CreatedAt"
                    ON "order"."orders" ("TenantId", "CreatedAt");

                CREATE INDEX IF NOT EXISTS "IX_orders_TenantId_UserId_CreatedAt"
                    ON "order"."orders" ("TenantId", "UserId", "CreatedAt");

                CREATE INDEX IF NOT EXISTS "IX_order_items_TenantId_OrderId"
                    ON "order"."order_items" ("TenantId", "OrderId");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DROP INDEX IF EXISTS "order"."IX_orders_TenantId_CreatedAt";
                DROP INDEX IF EXISTS "order"."IX_orders_TenantId_UserId_CreatedAt";
                DROP INDEX IF EXISTS "order"."IX_order_items_TenantId_OrderId";
                """);

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "order",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "order",
                table: "order_items");

            migrationBuilder.Sql(
                """
                CREATE INDEX IF NOT EXISTS "IX_orders_UserId_CreatedAt"
                    ON "order"."orders" ("UserId", "CreatedAt");
                """);
        }
    }
}
