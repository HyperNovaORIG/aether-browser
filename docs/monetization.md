# Aether Monetization

Aether is a productivity browser; pricing must respect that this is a tool
people open every day. We sell *capability and trust*, never feature
gating that breaks the calm.

## Tiers

| Tier | Price (target) | Audience | What you get |
|---|---|---|---|
| **Free** | $0 | Curious users, students | Full browser, BYO API keys, local Ollama, 1 workspace, basic memory |
| **Pro** | $19 / mo | Power users, founders, devs | Aether-hosted AI credits, unlimited workspaces, multi-agent collaboration, time-machine replay, plugin marketplace access, priority support |
| **Team** | $29 / seat / mo | Small teams | Everything in Pro + shared workspaces, live cursors, shared AI memory, admin controls |
| **Enterprise** | Custom | Companies | Everything + SSO, SCIM, audit logs, customer-managed keys, private model gateways, air-gapped deployment, dedicated support |

Free always retains a working AI experience via Ollama + Echo so the
product is genuinely useful without paying.

## AI credits

Pro and Team include a monthly credit pool. 1 credit ≈ 1 K tokens of GPT-4o
or 0.4 K tokens of Claude 3.5 Sonnet. Excess usage rolls onto a $0.005 /
credit metered overage. Heavy users can BYO keys at any tier.

## Plugin marketplace

- Free plugins: anyone can publish; 7-day moderation queue.
- Paid plugins: revenue share 85/15 to the developer (in line with
  open-source-friendly stores).
- "Aether Verified" badge: requires reproducible builds + signed manifest.

## Anti-patterns we won't do

- No ads, ever.
- No selling browsing data.
- No "dark patterns" (forced trials, hidden upsells, fake urgency).
- No locking core privacy controls behind a paywall.
- No artificial AI throttling on Free to push upgrades.

## Forecasting

The financial model assumes:

- 1 % Free → Pro conversion in year 1, 3 % by year 2.
- Pro ARPU $19 × 12 = $228.
- Team ARPU $29 × 12 × 5 (avg seats) = $1740.
- Gross margin >70 % on Pro after AI provider costs (assumes 70 % via cheap
  models, 30 % via premium).

## Pricing experiments

Quarterly experiments on:

- Annual discount %, currently planned 20 %.
- AI credit pool size vs. churn.
- Education discount for verified students.

All experiments are reviewed by the privacy team before launching; we never
A/B-test pricing on personal data.
