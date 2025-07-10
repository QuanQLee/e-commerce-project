#!/bin/bash
# Run Security service with hot reload for debugging
cd "$(dirname "$0")"
./gradlew bootRun
