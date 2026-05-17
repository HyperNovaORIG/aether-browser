# Aether Roadmap

## MVP — "AI companion for the internet" (this release)

- Working Electron desktop shell on macOS / Windows / Linux
- Vertical tab rail with smooth animations and inline favicons
- BrowserView-based multi-tab manager with per-profile session isolation
- AI sidebar with streaming chat (OpenAI, Anthropic, Ollama, Echo fallback)
- Capability-based model router with cost / latency / offline preferences
- Smart Command Palette (⌘K) with commands, tabs, agents and AI search
- Six agent scaffolds: Research, Coding, Shopping, Security, Travel, Automation
- Memory store with keyword + semantic (hashing) search, pinned notes
- Encrypted-at-rest persistence (AES-256-GCM)
- Plugin SDK (manifest + capability permissions + registry)
- Automation system with cron scheduler and step executor
- Glassmorphism design system, Inter typography, spring physics motion
- Architecture, security and SDK docs

## Beta — "Productive every day"

- AI tab summaries + semantic history search
- Workspaces with per-workspace memory and tab groups
- Live page context (selection, screenshot, DOM) piped into the sidebar
- "Time machine" session replay
- Embedded code editor + prompt playground
- Plugin marketplace (read-only)
- Vector index backed by SQLite (`sqlite-vss`) instead of in-memory
- True end-to-end encrypted sync (Signal-style)

## Pro — "Power users"

- Multi-agent collaboration (agents call agents, share context)
- Visual workflow builder for automations
- Browser macros + screen understanding
- Network analyser, AI devtools, API inspector
- Local LLM autopilot with on-device fallback
- Team workspaces with shared sessions + live cursors

## Enterprise — "Trust + scale"

- SSO (SAML/OIDC), SCIM, audit logs, retention policies
- Customer-managed keys (CMK) for memory encryption
- Private model gateways (Bedrock, Azure OpenAI, self-hosted)
- Policy engine for plugins, sites, AI usage
- Air-gapped deployments

## R&D — "What's after the AI browser?"

- Autonomous browsing autopilot
- Generative microsites + website remix
- Real-time meeting summariser (system audio)
- Voice-controlled navigation
- Predictive tab loading driven by session embedding
- Spatial / multi-window canvas mode
