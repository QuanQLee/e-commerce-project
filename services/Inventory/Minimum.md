## Inventory API

### Core Stock Endpoints
- `GET /inventory/{product_id}`: Query aggregated stock (supports `warehouse_id` query for single warehouse).
- `POST /inventory/stock/set`: Set stock of a SKU in a warehouse.
- `POST /inventory/reserve`: Legacy direct deduction on default warehouse.
- `POST /inventory/release`: Legacy stock release on default warehouse.

### Fulfillment Consistency Endpoints
- `POST /inventory/preallocate`: Reserve stock per order in a selected warehouse (multi-warehouse aware).
- `POST /inventory/deduct`: Confirm deduction for preallocated lines (reserved -> deducted).
- `POST /inventory/release-preallocation`: Release preallocated lines.
- `POST /inventory/fulfillment/resolve`: Resolve preferred warehouse by shipping region and available stock.

### Multi-Warehouse Rule
- Region-based warehouse priority is built-in (`CN/US/EU`) and can be overridden by `preferred_warehouse_id`.
- Allocation succeeds only when one warehouse can fulfill all order lines to keep deduction consistency.
