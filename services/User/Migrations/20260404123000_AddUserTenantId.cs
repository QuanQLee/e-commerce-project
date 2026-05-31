using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using User.Api.Infrastructure;

#nullable disable

namespace User.Migrations;

[DbContext(typeof(UserDbContext))]
[Migration("20260404123000_AddUserTenantId")]
public partial class AddUserTenantId : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            ALTER TABLE "user"."users"
                ADD COLUMN IF NOT EXISTS "TenantId" character varying(80) NOT NULL DEFAULT 'public';

            CREATE INDEX IF NOT EXISTS "IX_users_TenantId"
                ON "user"."users" ("TenantId");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""DROP INDEX IF EXISTS "user"."IX_users_TenantId";""");

        migrationBuilder.DropColumn(
            name: "TenantId",
            schema: "user",
            table: "users");
    }
}
