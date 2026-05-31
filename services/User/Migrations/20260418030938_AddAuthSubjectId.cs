using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace User.Migrations
{
    /// <inheritdoc />
    public partial class AddAuthSubjectId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AuthSubjectId",
                schema: "user",
                table: "users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_AuthSubjectId",
                schema: "user",
                table: "users",
                column: "AuthSubjectId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_users_AuthSubjectId",
                schema: "user",
                table: "users");

            migrationBuilder.DropColumn(
                name: "AuthSubjectId",
                schema: "user",
                table: "users");
        }
    }
}
