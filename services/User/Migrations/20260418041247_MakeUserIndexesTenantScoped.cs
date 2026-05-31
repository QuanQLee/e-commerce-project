using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace User.Migrations
{
    /// <inheritdoc />
    public partial class MakeUserIndexesTenantScoped : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "user"."users"
                    ADD COLUMN IF NOT EXISTS "TenantId" character varying(80) NOT NULL DEFAULT 'public';

                CREATE INDEX IF NOT EXISTS "IX_users_TenantId"
                    ON "user"."users" ("TenantId");

                DROP INDEX IF EXISTS "user"."IX_users_Email";
                DROP INDEX IF EXISTS "user"."IX_users_UserName";

                CREATE UNIQUE INDEX IF NOT EXISTS "IX_users_TenantId_Email"
                    ON "user"."users" ("TenantId", "Email");

                CREATE UNIQUE INDEX IF NOT EXISTS "IX_users_TenantId_UserName"
                    ON "user"."users" ("TenantId", "UserName");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DROP INDEX IF EXISTS "user"."IX_users_TenantId_Email";
                DROP INDEX IF EXISTS "user"."IX_users_TenantId_UserName";

                CREATE UNIQUE INDEX IF NOT EXISTS "IX_users_Email"
                    ON "user"."users" ("Email");

                CREATE UNIQUE INDEX IF NOT EXISTS "IX_users_UserName"
                    ON "user"."users" ("UserName");
                """);
        }
    }
}
