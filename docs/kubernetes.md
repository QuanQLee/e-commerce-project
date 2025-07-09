# Kubernetes Deployment Guide

This document describes how to run the microservices on a Kubernetes cluster. It
complements the existing Docker Compose setup used for local development.

## Overview

Each service is packaged as a Docker image. In production these images can be
deployed as Kubernetes **Deployments**. A single PostgreSQL instance should be
provisioned as a **StatefulSet** so that data persists across restarts. The Kong
gateway runs as a Deployment and exposes HTTP/HTTPS via an **Ingress** resource.

Configuration values such as database credentials or JWT signing keys should be
stored in **ConfigMaps** and **Secrets** instead of hardcoded compose variables.
The sample manifests under the `k8s/` folder illustrate this approach.

Horizontal Pod Autoscalers can be added to scale services based on CPU or custom
metrics. Log output and Prometheus metrics are already supported by the
applications; simply scrape them using Prometheus and configure alert rules as
shown in `services/prometheusRule.yaml`.

### Converting Compose to Kubernetes

1. Create a Deployment for each service similar to `k8s/service-deployment.yaml`.
2. Convert shared services like PostgreSQL using a StatefulSet, see
   `k8s/postgres-statefulset.yaml`.
3. Mount configuration via ConfigMaps and Secrets.
4. Expose the Kong gateway with an Ingress as in
   `k8s/kong-deployment.yaml`.

These manifests can be managed manually or packaged into a Helm chart. Helm makes
it easy to provide separate values files for dev, staging and production
clusters.

## Cloud Environments

On AWS the cluster can run on EKS or ECS Fargate. The database may be hosted on
RDS PostgreSQL and the frontend served from S3 behind CloudFront. Message queues
and caches can use managed options such as SQS or ElastiCache. Other cloud
providers offer similar services if you prefer a vendor neutral setup.

## Additional Recommendations

- Ensure each service logs structured messages so that outputs can be aggregated
  by tools like Elasticsearch or CloudWatch.
- Expose Prometheus metrics; these are already available from the gateway and
  several services.
- Maintain unit and contract tests as described in `docs/testing.md` to catch
  regressions before deploying.
- Use the provided debug scripts (see `docs/debugging.md`) for local
  troubleshooting.
- Extend `services/prometheusRule.yaml` with alert rules for your environment.
- Apply Kubernetes `NetworkPolicy` objects to restrict traffic between pods.
  See `docs/security-best-practices.md` for an example that locks down
  PostgreSQL access.

