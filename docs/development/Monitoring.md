# Monitoring

The health endpoint reports process availability and the readiness endpoint
checks PostgreSQL connectivity. Production should add
structured logs with request IDs, latency/error metrics, database pool metrics,
transfer failure alerts, distributed traces, and separate readiness/liveness
probes. Never log passwords, tokens, database URLs, or personal transaction data.
