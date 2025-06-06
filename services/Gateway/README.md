# Gateway

This container provides a simple Nginx-based API gateway used for local development. Requests are routed to individual microservices based on path.

- `/catalog/` -> Catalog service
- `/order/` -> Order service
- `/payment/` -> Payment service (HTTP)
- `/grpc/payment/` -> Payment service gRPC
- `/security/` -> Security service

Run through docker-compose together with the other services.
