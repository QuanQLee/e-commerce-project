using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Order.Migrations;

public partial class AddUserId : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<Guid>(
            name: "UserId",
            schema: "order",
            table: "orders",
            type: "uuid",
            nullable: false,
            defaultValue: Guid.Empty);

        migrationBuilder.AddColumn<DateTime>(
            name: "CreatedAt",
            schema: "order",
            table: "orders",
            type: "timestamp with time zone",
            nullable: false,
            defaultValueSql: "now() at time zone 'utc'");

        migrationBuilder.CreateIndex(
            name: "IX_orders_UserId_CreatedAt",
            schema: "order",
            table: "orders",
            columns: new[] { "UserId", "CreatedAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_orders_UserId_CreatedAt",
            schema: "order",
            table: "orders");

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

