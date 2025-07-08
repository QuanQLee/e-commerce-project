# Database Guidelines

This document collects conventions and tips for designing the service schemas.

## Naming

- Use **lowercase with underscores** for table and column names.
- Keep each microservice in its own PostgreSQL schema to avoid collisions.

## Constraints

- Add unique indexes on business keys such as usernames or emails.
- Reference related records with foreign keys when possible. If schemas are
  separate, validate the relationship in the application layer.
- Maintain integrity for order items and inventory updates either through
  database constraints or transactional logic.

## Indexes

- Create indexes for common lookup fields. Examples:
  - `users.user_name` and `users.email` for login.
  - `orders(user_id, created_at)` to speed up history queries.
  - `products(name)` and `products(category)` for catalog searches.
- Revisit the query plan regularly as data grows and adjust indexes
  accordingly.

## Migrations

Use `EF Core Migrations` or similar tools to evolve the schemas over time.
Commit migration files alongside the code so that environments stay in sync.

Maintaining these practices keeps the data model consistent across services and
improves overall performance.
