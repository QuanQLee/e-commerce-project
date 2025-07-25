# Platform Services Overview

This document describes optional infrastructure components that complement the core microservices. They can be added incrementally depending on your deployment needs.

## Event Bus

Introduce a message broker such as **Kafka**, **RabbitMQ** or **NATS** to decouple services. Domain events like `ORDER_CREATED` or `PAYMENT_RECEIVED` are published asynchronously so other services can react without direct dependencies.

## Workflow Orchestrator

Long running or multi-step business processes can be coordinated using a workflow engine (Temporal/Cadence or Camunda). When a saga fails it triggers compensating actions to roll back related services.

## Configuration and Feature Flags

Centralised configuration with **Consul**, **Etcd** or **Nacos** lets you update settings without redeploying. Feature flag systems like **Unleash** or **LaunchDarkly** enable gradual rollouts and A/B testing.

## Notification Service

A dedicated notification service handles email, SMS, push and in-app messages. It supports templating, retry with backoff and respects user preferences for different channels.

## Log and Audit Service

Aggregate structured logs and audit records in a single place. Apply redaction for sensitive fields and configure alerts when suspicious activity is detected.

## Monitoring and Tracing

Use **Prometheus** and **Grafana** for metrics alongside **Jaeger** for distributed traces. Instrument services with **OpenTelemetry** so requests can be followed end-to-end.

## API Portal

Expose each service's OpenAPI contract through an API portal. Versions can be browsed online and tools such as Dredd or Schemathesis run contract tests. SDKs may be generated automatically for consumers.

## Developer Portal

Provide a self-service portal where third-party developers register applications. Features include OAuth client management, rate limiting and usage-based billing.

