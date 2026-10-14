# AegisDNS — Master DNS Blocklist Curator & Analyzer

A high-performance DNS blocklist aggregator, deduplicator, cache pre-warmer, and DNS Recommendation Engine with interactive geographic distance topology map designed specifically for **AdGuard Home** and network-level DNS sinkholes.

Available as a **production Docker container** with full multi-architecture support, ready for **private GitHub repositories**.

---

## Key Features

- **Consolidated Master List**: Combines community blocklists (Hägezi, OISD, StevenBlack, AdGuard DNS, URLhaus, etc.) and custom sources into a single optimized master blocklist.
- **Intelligent Deduplication**: Removes duplicate rules, standardizes domains, prunes redundant entries, and tracks exact efficiency gains.
- **Cross-Source Overlap Matrix**: In-depth pairwise comparison showing how much overlap exists between sources and which lists contain truly unique blocked domains.
- **Uniqueness Metrics**: Identifies the exact percentage and count of domains exclusive to each list, helping you eliminate redundant filters.
- **DNS Tools Suite & Pre-Warmer**: Cache pre-warmer with live rolling latency averages, cold vs primed caching comparison, upstream detection, and whois lookup.
- **DNS Recommendation Engine**: Analyzes real-time DNS benchmarks and recommends the best upstream DNS providers based on your location and connection type (Fiber, Cable, DSL, Cellular, Satellite).
- **Geographic Network Topology Map**: Interactive world map plotting client IP, upstream DNS, and candidate servers with geodesic flight arcs and distance-weighted latency.
- **AdGuard Home Direct Integration**: Hosts `/api/master.txt` (or `/blocklist.txt`) formatted for AdGuard Home (`||domain^`), hosts format (`0.0.0.0 domain`), or plain domains.
- **Periodic Auto-Sync**: Background worker periodically refreshes upstream lists (every 1h, 6h, 12h, or 24h) with status telemetry.
- **Domain Inspector**: Instantly check if a domain is blocked, which active lists block it, and whether it is unique to a single source.
- **Global Whitelist**: Protect vital domains (e.g. `apple.com`, `google.com`, `microsoft.com`) from being blocked by third-party lists.
- **Private GitHub Repo Docker Ready**: Multi-stage hardened Alpine build, `.dockerignore` secret shielding, non-root user execution, and GitHub Container Registry (GHCR) CI/CD automation.

---

## Using Docker on a Private GitHub Repository

### Option 1: Local Build & Run from Cloned Private Repo

Clone your private GitHub repository and build the container locally:

```bash
# 1. Clone your private repository
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# 2. (Optional) Configure environment variables
cp .env.example .env

# 3. Build and launch the container
docker compose up -d --build
```

The application will be accessible at:
- **Dashboard**: `http://localhost:3000`
- **AdGuard Home Master List**: `http://localhost:3000/api/master.txt`
- **Health Check**: `http://localhost:3000/api/health`

---

### Option 2: Pulling from GitHub Container Registry (GHCR)

If you use the included GitHub Actions workflow, each push to your private repository automatically builds and publishes a private Docker image to `ghcr.io`.

#### 1. Generate a GitHub Personal Access Token (PAT)
1. Go to **GitHub Settings** > **Developer Settings** > **Personal Access Tokens** > **Tokens (classic)**.
2. Generate a token with the **`read:packages`** scope (and **`repo`** if using private git dependencies).

#### 2. Authenticate Docker with GHCR
Run this once on your host or server (e.g., Raspberry Pi, Unraid, Proxmox, VPS):

```bash
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

#### 3. Run with Docker Compose
Edit `.env` (or set environment variables) with your private image:

```env
DOCKER_IMAGE=ghcr.io/<your-username>/<your-repo>:latest
```

Then pull and start:

```bash
docker compose pull
docker compose up -d
```

---

### Option 3: Automated CI/CD via GitHub Actions

A pre-configured GitHub Actions workflow is provided at `.github/workflows/docker-publish.yml`.

When you push code to `main` or push a tag (`v1.0.0`), GitHub Actions will:
1. Automatically authenticate using the built-in `secrets.GITHUB_TOKEN` (zero configuration needed).
2. Build the multi-stage production container with Docker Buildx.
3. Cache build layers using GitHub Actions cache for ultra-fast incremental builds.
4. Push the image securely to your private GitHub Container Registry (`ghcr.io/<your-username>/<your-repo>:latest`).

#### Enabling Package Access for Private Repositories:
1. On GitHub, go to your repository **Settings** > **Actions** > **General**.
2. Under **Workflow permissions**, select **Read and write permissions**.
3. Save. That's it!

---

### Building with Private Submodules or Private NPM Packages

If your private repository relies on private submodules or private GitHub npm packages, pass your GitHub token as a build argument:

```bash
# Direct Docker build:
docker build \
  --build-arg GITHUB_TOKEN="ghp_yourPersonalAccessToken" \
  -t aegisdns:latest .

# Or via Docker Compose:
GITHUB_TOKEN="ghp_yourPersonalAccessToken" docker compose up -d --build
```

The `Dockerfile` securely registers the token during dependency installation and deletes credentials (`.npmrc` and `.gitconfig`) before any image layers are saved, preventing token leakage.

---

## AdGuard Home Integration

1. In AdGuard Home, navigate to **Filters** > **DNS blocklists**.
2. Click **Add blocklist** > **Add a custom list**.
3. Name: `AegisDNS Master List`
4. URL: `http://<YOUR_SERVER_IP>:3000/api/master.txt`
5. Click **Save**. AdGuard Home will now pull your deduplicated, curated master blocklist!

---

## Project Structure

- `Dockerfile` - Multi-stage container builder with non-root security and token injection
- `docker-compose.yml` - Production orchestration with persistent data volume and log rotation
- `.dockerignore` - Whitelist and security shield preventing secret and git leaks
- `.github/workflows/docker-publish.yml` - Automated GitHub Actions workflow for GHCR
- `server.ts` - Express backend with DNS pre-warmer, recommendation engine, and AdGuard API
- `src/` - React 19 + Tailwind CSS frontend dashboard
- `rust_engine/` - Optional native Rust Axum/Tokio server engine (`docker build --target rust-runner .`)
