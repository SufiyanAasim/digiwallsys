# Performance

Wallet rows are locked in stable user order during transfers. History indexes
cover sender and receiver wallet timestamps. Before scaling, add cursor-based
pagination, load tests, query plans, pool saturation alerts, and bounded API
request rates. Optimize only from measured bottlenecks.
