#!/bin/bash -e

echo "Stopping stack.."
docker-compose down

echo "Generating config for Prometheus.."
node generate-config.js

echo "Running stack.."
docker-compose up -d
