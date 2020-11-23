#!/bin/bash -e

echo "Generating config for Prometheus.."
node generate-config.js

echo "Running stack.."
docker-compose up -d
