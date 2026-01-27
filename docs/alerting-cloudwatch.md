# CloudWatch Alerting (Baseline)

This guide provides a minimal set of CloudWatch alarms for RDS and ElastiCache.
Use it to ensure production gets paged on the most common failure modes.

## Prerequisites
- AWS CLI configured
- An SNS topic for alert notifications

## Environment variables
```
AWS_REGION=us-west-2
SNS_TOPIC_ARN=arn:aws:sns:us-west-2:123456789012:prod-alerts
RDS_INSTANCE_ID=ecommerce-prod-db
REDIS_CLUSTER_ID=ecommerce-redis
```

## Apply alarms
```bash
export AWS_REGION=us-west-2
export SNS_TOPIC_ARN=arn:aws:sns:us-west-2:123456789012:prod-alerts
export RDS_INSTANCE_ID=ecommerce-prod-db
export REDIS_CLUSTER_ID=ecommerce-redis
./scripts/create-cloudwatch-alarms.sh
```

## Notes
- Tune thresholds to your expected load and capacity.
- Add alarms for memory, storage, replication lag, and latency as your SLOs mature.
