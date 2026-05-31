using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using User.Api.Infrastructure;

#nullable disable

namespace User.Migrations;

[DbContext(typeof(UserDbContext))]
[Migration("20250726120000_AddUserIndexes")]
public partial class AddUserIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_users_UserName"
                ON "user"."users" ("UserName");

            CREATE UNIQUE INDEX IF NOT EXISTS "IX_users_Email"
                ON "user"."users" ("Email");
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            DROP INDEX IF EXISTS "user"."IX_users_UserName";
            DROP INDEX IF EXISTS "user"."IX_users_Email";
            """);
    }
}
