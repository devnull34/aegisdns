# AegisDNS — Master DNS Blocklist Curator & Analyzer

A high-performance DNS blocklist aggregator, deduplicator, and cross-source overlap analyzer designed specifically for **AdGuard Home** and network-level DNS sinkholes.

Available as both a **Dockerized Rust container** and a responsive **WebUI**.

---

## Key Features

- **Consolidated Master List**: Combines community blocklists (Hägezi, OISD, StevenBlack, AdGuard DNS, URLhaus, etc.) and custom sources into a single optimized master blocklist.
- **Intelligent Deduplication**: Removes duplicate rules, standardizes domains, prunes redundant entries, and tracks exact efficiency gains.
- **Cross-Source Overlap Matrix**: In-depth pairwise comparison showing how much overlap exists between sources and which lists contain truly unique blocked domains.
- **Uniqueness Metrics**: Identifies the exact percentage and count of domains exclusive to each list, helping you eliminate redundant filters.
- **AdGuard Home Direct Integration**: Hosts `/api/master.txt` (or `/blocklist.txt`) formatted for AdGuard Home (`||domain^`), hosts format (`0.0.0.0 domain`), or plain domains.
- **Periodic Auto-Sync**: Background worker periodically refreshes upstream lists (every 1h, 6h, 12h, or 24h) with status telemetry.
- **Domain Inspector**: Instantly check if a domain is blocked, which active lists block it, and whether it is unique to a single source.
- **Global Whitelist**: Protect vital domains (e.g. `apple.com`, `google.com`, `microsoft.com`) from being blocked by third-party lists.
- **Docker & Rust Native Architecture**: Provided with multi-stage `Dockerfile` and `docker-compose.yml` for 1-click self-hosting.

---

## Quick Start with Docker

Run with Docker Compose:

```bash
docker compose up -d
```

Access the WebUI:
- Dashboard: `http://localhost:3000`
- Master Blocklist for AdGuard Home: `http://localhost:3000/api/master.txt`

---

## AdGuard Home Integration

1. In AdGuard Home, navigate to **Filters** > **DNS blocklists**.
2. Click **Add blocklist** > **Add a custom list**.
3. Name: `AegisDNS Master List`
4. URL: `http://<YOUR_SERVER_IP>:3000/api/master.txt`
5. Click **Save**. AdGuard Home will now pull your deduplicated, curated master blocklist!

---

## Project Structure

- `server.ts` - Express backend with Vite middleware integration
- `src/` - React 19 + Tailwind CSS frontend dashboard
- `rust_engine/` - Native Rust Axum/Tokio server engine
- `Dockerfile` - Multi-stage container builder (Rust + Vite)
- `docker-compose.yml` - Container orchestration configuration
