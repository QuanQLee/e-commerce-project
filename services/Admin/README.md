# Admin Service

This service provides backoffice management APIs for the e-commerce platform.
It proxies requests to other services such as Catalog, Order and User.
Metrics are exported on `/metrics` and traces are printed to the console.
Run locally with `./debug-admin.sh`.
