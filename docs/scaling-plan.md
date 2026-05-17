# Scaling Plan

Aether is a desktop-first product, but it relies on a backend for AI
credits, marketplace, sync and team collaboration. This document captures
how each tier scales.

## Targets

| Stage | Active users | Concurrent AI streams | Sync events / sec |
|---|---|---|---|
| Alpha | 100 | 20 | 5 |
| Beta | 50 k | 5 k | 1 k |
| GA | 500 k | 50 k | 25 k |
| Y2 | 2 M | 200 k | 200 k |

## Architecture phases

### Phase 1 — Single region (Beta)

- Cloud provider: AWS us-east-1.
- Edge: CloudFront + AWS Lambda@Edge for static + auth.
- API: Node.js Fastify + Postgres (Aurora Serverless v2).
- Async: SQS + Lambda workers.
- AI proxy: stateless Fargate cluster behind ALB.
- Object storage: S3 for plugin manifests + builds.

### Phase 2 — Multi-region (GA)

- Active-active in us-east-1, eu-west-1, ap-southeast-2.
- DynamoDB Global Tables for low-latency reads of plugins + identity.
- Aurora Postgres global database for billing + team data.
- Per-region AI proxy with provider failover.

### Phase 3 — Edge-first (Year 2)

- Cloudflare Workers for chat-completion proxying (lower latency, fewer
  hops to providers).
- Cloudflare D1 for read-heavy plugin catalogue.
- AWS retained for transactional + auth flows.

## Hot paths

- AI streaming proxy must support 50 k concurrent SSE connections per
  region. We use AWS NLB → Fargate (1 vCPU per ~200 streams).
- Memory sync uses CRDT diffs; payloads are <1 KB on average; throughput
  scales linearly with workers.
- Plugin marketplace catalogue is fully cached at the edge and updated via
  pushed invalidation when a new version is approved.

## Cost model

- Per-user infrastructure cost target: **< $0.30 / mo** at Beta scale,
  **< $0.10 / mo** at GA scale.
- AI provider cost is treated separately and is the dominant variable;
  controlled via the model router's cost ceilings.

## Reliability

- 99.9 % availability target for AI streaming.
- Per-region kill switches that fail over to "local-only" client behaviour
  if the cloud is unreachable.
- Chaos drills monthly.
- Postmortems published in 5 working days.

## Observability

- OpenTelemetry traces across desktop → gateway → provider.
- Datadog for metrics, logs, traces.
- p99 latency SLO: streaming first-byte < 500 ms.

## Data growth

- Per-user memory: 100 MB average at GA → 200 TB total → partitioned by
  user_id with shared-nothing Postgres or hosted SQLite-per-user (Turso /
  Cloudflare D1).
- Telemetry retained 90 days (anonymous), 30 days for crash reports.

## Org growth

- We hire one SRE per ~500 k active users.
- Privacy + Security teams scale with regulatory footprint (one
  privacy engineer per major jurisdiction).
