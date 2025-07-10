using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace User.Migrations;

public partial class AddUserIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateIndex(
            name: "IX_users_UserName",
            schema: "user",
            table: "users",
            column: "UserName",
            unique: true);
        migrationBuilder.CreateIndex(
            name: "IX_users_Email",
            schema: "user",
            table: "users",
            column: "Email",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_users_UserName",
            schema: "user",
            table: "users");
        migrationBuilder.DropIndex(
            name: "IX_users_Email",
            schema: "user",
            table: "users");
    }
}

