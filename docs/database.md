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

## Scaling and Capacity Planning

While sharing a single PostgreSQL instance simplifies local development, production deployments often require stronger isolation and room to scale. Consider using dedicated database instances for high traffic services such as **Order** and **Payment** to avoid a single point of failure. Lightweight workloads like the shopping cart can also move to a NoSQL store if write throughput becomes a bottleneck.

Analytical workloads benefit from columnar or warehouse solutions. Offload historical events from the `Analytics` service to a data lake or OLAP database so the primary store stays lean.

### Multi‐store Architecture

- Elasticsearch can power product search.
- Redis or another cache helps reduce database pressure.
- Maintain data consistency when mixing storage technologies as the architecture becomes more complex.

### Performance

- Introduce read replicas for heavy read scenarios and split reads from writes via replication.
- Partition very large tables – for example by time range on order or log records – to keep queries fast and simplify archiving.
- Define retention policies for event tables and regularly back up each database instance. Practise restores to ensure business continuity.
