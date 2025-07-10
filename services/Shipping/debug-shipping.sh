#!/bin/bash
# Run Shipping service with hot reload for debugging
cd "$(dirname "$0")"
dotnet watch run --no-launch-profile
