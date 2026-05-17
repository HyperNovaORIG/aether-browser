# Enterprise Roadmap

Aether's Enterprise tier is built around three promises: **control**,
**isolation**, and **auditability**. Every feature below answers one of
those promises.

## Identity & access

- SSO via SAML 2.0 and OIDC (Okta, Azure AD, Google Workspace, Auth0).
- SCIM 2.0 provisioning and deprovisioning.
- Just-In-Time (JIT) account creation with attribute mapping.
- Per-role policies for AI usage, plugin install, network access.

## Data residency

- Customer-managed keys (CMK) via AWS KMS, GCP KMS or Azure Key Vault.
- All memory blobs encrypted with the customer's key.
- Regional pinning (EU, US, AU, JP).
- Optional on-prem AI gateway running in the customer's VPC.

## Audit & compliance

- Tamper-evident audit log (hash-chain).
- Webhook export to Splunk, Datadog, Elastic.
- Per-action provenance (who, when, on which machine, which version).
- SOC 2 Type II by end of year 2, ISO 27001 + GDPR + CCPA in parallel.

## Policy engine

- Allow/deny lists for sites, AI providers, plugins.
- DLP rules: redact patterns from outbound AI requests (e.g. credit card
  numbers, PHI).
- Mandatory workspace templates.
- "Air-gapped mode" forces local-only AI, blocks all outbound network.

## Procurement

- Annual or multi-year contracts with custom MSAs.
- Volume discounts at 100, 500, 1000 seats.
- Floating licenses, named licenses, or pooled credits.
- Invoicing (PO, ACH, wire), purchase orders, NET-30/60.

## Support

- Dedicated CSM and TAM.
- 24/7 critical support (1 hour P1 response).
- Annual on-site (Pro Services) workshops.
- Roadmap influence via the Enterprise Council.

## Deployment options

- Aether Cloud (default, multi-tenant in our infrastructure).
- Single-tenant cloud (per-region).
- Self-hosted gateway (Docker / Kubernetes Helm chart).
- Air-gapped install (offline-only).

## Integrations

- Identity: Okta, Azure AD, Google Workspace, Ping, Auth0.
- DLP / SIEM: Splunk, Datadog, Elastic, Sumo Logic, Snowflake.
- Storage: S3, Azure Blob, GCS, MinIO, on-prem NFS.
- AI providers: Azure OpenAI, Bedrock, Vertex AI, private model gateways.

## Procuring trust

Customer security teams get a single intake: a packaged "Trust Centre"
containing SOC 2, ISO, PenTest reports, architecture diagrams, DPAs and
sub-processor list. Aether's posture is reviewed every 90 days.
