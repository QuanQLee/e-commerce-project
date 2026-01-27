#!/usr/bin/env bash
set -euo pipefail

# Creates baseline CloudWatch alarms for RDS and ElastiCache.
# Requires AWS CLI configured with access to CloudWatch and SNS.

AWS_REGION="${AWS_REGION:-}"
SNS_TOPIC_ARN="${SNS_TOPIC_ARN:-}"
RDS_INSTANCE_ID="${RDS_INSTANCE_ID:-}"
REDIS_CLUSTER_ID="${REDIS_CLUSTER_ID:-}"
DRY_RUN="${DRY_RUN:-false}"

if [[ -z "${AWS_REGION}" || -z "${SNS_TOPIC_ARN}" ]]; then
  echo "AWS_REGION and SNS_TOPIC_ARN are required." >&2
  exit 1
fi
if [[ -z "${RDS_INSTANCE_ID}" || -z "${REDIS_CLUSTER_ID}" ]]; then
  echo "RDS_INSTANCE_ID and REDIS_CLUSTER_ID are required." >&2
  exit 1
fi

run() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] $*"
    return
  fi
  "$@"
}

run aws cloudwatch put-metric-alarm \
  --region "${AWS_REGION}" \
  --alarm-name "rds-high-cpu-${RDS_INSTANCE_ID}" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --dimensions Name=DBInstanceIdentifier,Value="${RDS_INSTANCE_ID}" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "${SNS_TOPIC_ARN}"

run aws cloudwatch put-metric-alarm \
  --region "${AWS_REGION}" \
  --alarm-name "rds-high-connections-${RDS_INSTANCE_ID}" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --dimensions Name=DBInstanceIdentifier,Value="${RDS_INSTANCE_ID}" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 200 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "${SNS_TOPIC_ARN}"

run aws cloudwatch put-metric-alarm \
  --region "${AWS_REGION}" \
  --alarm-name "redis-evictions-${REDIS_CLUSTER_ID}" \
  --metric-name Evictions \
  --namespace AWS/ElastiCache \
  --dimensions Name=CacheClusterId,Value="${REDIS_CLUSTER_ID}" \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions "${SNS_TOPIC_ARN}"

run aws cloudwatch put-metric-alarm \
  --region "${AWS_REGION}" \
  --alarm-name "redis-high-cpu-${REDIS_CLUSTER_ID}" \
  --metric-name CPUUtilization \
  --namespace AWS/ElastiCache \
  --dimensions Name=CacheClusterId,Value="${REDIS_CLUSTER_ID}" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "${SNS_TOPIC_ARN}"

echo "CloudWatch alarms applied."
