using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Order.Api.Infrastructure;

#nullable disable

namespace Order.Migrations
{
    [DbContext(typeof(OrderDbContext))]
    [Migration("20250726120100_AddUserId")]
    public partial class AddUserId : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "order"."orders"
                    ADD COLUMN IF NOT EXISTS "UserId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

                ALTER TABLE "order"."orders"
                    ADD COLUMN IF NOT EXISTS "CreatedAt" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc');

                CREATE INDEX IF NOT EXISTS "IX_orders_UserId_CreatedAt"
                    ON "order"."orders" ("UserId", "CreatedAt");
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""DROP INDEX IF EXISTS "order"."IX_orders_UserId_CreatedAt";""");

            migrationBuilder.DropColumn(
                name: "UserId",
                schema: "order",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                schema: "order",
                table: "orders");
        }
    }
}
