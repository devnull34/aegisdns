import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { manager } from './src/server/storage';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Sources CRUD & Management
app.get('/api/sources', (_req: Request, res: Response) => {
  res.json(manager.getSources());
});

app.post('/api/sources', (req: Request, res: Response) => {
  try {
    const { name, url, category, format, description, customContent } = req.body;
    if (!name || (!url && !customContent)) {
      res.status(400).json({ error: 'Name and either URL or custom blocklist content are required.' });
      return;
    }
    const source = manager.addSource({ name, url, category, format, description, customContent });
    res.status(201).json(source);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sources/:id', (req: Request, res: Response) => {
  const success = manager.removeSource(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Source not found' });
    return;
  }
  res.json({ success: true });
});

app.post('/api/sources/:id/toggle', (req: Request, res: Response) => {
  const { enabled } = req.body;
  const source = manager.toggleSource(req.params.id, enabled);
  if (!source) {
    res.status(404).json({ error: 'Source not found' });
    return;
  }
  res.json(source);
});

app.post('/api/sources/:id/sync', async (req: Request, res: Response) => {
  const success = await manager.fetchSource(req.params.id);
  res.json({ success });
});

app.post('/api/sync-all', async (_req: Request, res: Response) => {
  const result = await manager.syncAll();
  res.json(result);
});

// Statistics, Duplicate Reduction & Overlap Matrix
app.get('/api/stats', (_req: Request, res: Response) => {
  res.json(manager.getStats());
});

// Settings & Whitelist
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(manager.getSettings());
});

app.put('/api/settings', (req: Request, res: Response) => {
  const updated = manager.updateSettings(req.body);
  res.json(updated);
});

// Activity / Sync Logs
app.get('/api/logs', (_req: Request, res: Response) => {
  res.json(manager.getLogs());
});



import { OutputFormat } from './src/types/blocklist';
import {
  KNOWN_UPSTREAM_SERVERS,
  detectUserLocation,
  generateDnsRecommendations,
  performDnsLookup,
  performWhois,
  precacheEngine,
  runAllBenchmarks,
  runDnsLeakTest,
} from './src/server/dnsTools';
import { majesticManager } from './src/server/majesticManager';

// Master Blocklist Raw Endpoint with on-the-fly Format Conversion
const serveMaster = (req: Request, res: Response) => {
  let format: OutputFormat | undefined;
  const requestedFormat = (req.query.format as string)?.toLowerCase();

  if (
    requestedFormat === 'adguard' ||
    requestedFormat === 'pihole' ||
    requestedFormat === 'hosts' ||
    requestedFormat === 'rpz' ||
    requestedFormat === 'domains' ||
    requestedFormat === 'dnsmasq' ||
    requestedFormat === 'unbound' ||
    requestedFormat === 'wildcard'
  ) {
    format = requestedFormat as OutputFormat;
  } else if (req.path.endsWith('.rpz')) {
    format = 'rpz';
  } else if (req.path.endsWith('.hosts') || req.path.endsWith('.pihole')) {
    format = 'pihole';
  } else if (req.path.endsWith('.adguard')) {
    format = 'adguard';
  }

  const content = manager.getMasterOutput(format);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');

  if (req.query.download === 'true') {
    const filename = `aegisdns-master-${format || 'adguard'}.txt`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  }

  res.send(content);
};

app.get('/api/master.txt', serveMaster);
app.get('/api/master.rpz', serveMaster);
app.get('/api/master.hosts', serveMaster);
app.get('/api/master.adguard', serveMaster);
app.get('/master.txt', serveMaster);
app.get('/blocklist.txt', serveMaster);
app.get('/adguard.txt', serveMaster);

// ==========================================
// DNS BENCHMARK, LEAK TEST & DIAGNOSTICS APIS
// ==========================================

// 1. Upstream Servers List
app.get('/api/dns/servers', (_req: Request, res: Response) => {
  res.json(KNOWN_UPSTREAM_SERVERS);
});

// 2. DNS Benchmark (GRC DNS Bench style)
app.get('/api/dns/benchmark', async (req: Request, res: Response) => {
  try {
    const protocol = ((req.query.protocol as string) || 'regular') as any;
    const results = await runAllBenchmarks(protocol);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. DNS Leak Test
app.get('/api/dns/leak-test', async (_req: Request, res: Response) => {
  try {
    const results = await runDnsLeakTest();
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3.5 DNS GeoIP & Location Intelligence
app.get('/api/dns/geoip', async (_req: Request, res: Response) => {
  try {
    const userLocation = await detectUserLocation();
    res.json(userLocation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3.6 Upstream DNS Recommendation Engine (with Location & Connection Type analysis)
app.get('/api/dns/recommendations', async (req: Request, res: Response) => {
  try {
    const connectionType = (req.query.connectionType as any) || 'fiber';
    const protocol = (req.query.protocol as any) || 'regular';
    const defaultUpstream = manager.getSettings().upstreamDns || '192.168.1.1';
    const recommendations = await generateDnsRecommendations(connectionType, protocol, defaultUpstream);
    res.json(recommendations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dns/recommendations', async (req: Request, res: Response) => {
  try {
    const { connectionType = 'fiber', protocol = 'regular' } = req.body || {};
    const defaultUpstream = manager.getSettings().upstreamDns || '192.168.1.1';
    const recommendations = await generateDnsRecommendations(connectionType, protocol, defaultUpstream);
    res.json(recommendations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. DNS nslookup / dig
app.get('/api/dns/lookup', async (req: Request, res: Response) => {
  try {
    const domain = (req.query.domain as string) || 'google.com';
    const type = ((req.query.type as string) || 'A') as any;
    const server = (req.query.server as string) || '1.1.1.1';
    const protocol = ((req.query.protocol as string) || 'regular') as any;
    const result = await performDnsLookup(domain, type, server, protocol);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. WHOIS / RDAP
app.get('/api/dns/whois', async (req: Request, res: Response) => {
  try {
    const domain = req.query.domain as string;
    if (!domain) {
      res.status(400).json({ error: 'domain query parameter is required' });
      return;
    }
    const result = await performWhois(domain);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. DNS Pre-caching / Cache Warmer (Top 1M)
app.get('/api/dns/precache/status', (_req: Request, res: Response) => {
  res.json(precacheEngine.getStatus());
});

app.post('/api/dns/precache/start', (req: Request, res: Response) => {
  const { targetTotal, targetServer } = req.body || {};
  const defaultUpstream = manager.getSettings().upstreamDns || '192.168.1.1';
  precacheEngine.start(targetTotal || 10000, targetServer || defaultUpstream);
  res.json(precacheEngine.getStatus());
});

app.post('/api/dns/precache/recalculate-proof', async (req: Request, res: Response) => {
  try {
    const { domain, targetServer } = req.body || {};
    const defaultUpstream = manager.getSettings().upstreamDns || '192.168.1.1';
    const sample = await precacheEngine.recalculateProof(domain || 'google.com', targetServer || defaultUpstream);
    res.json({ success: true, sample, status: precacheEngine.getStatus() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dns/precache/pause', (_req: Request, res: Response) => {
  precacheEngine.pause();
  res.json(precacheEngine.getStatus());
});

app.post('/api/dns/precache/resume', (_req: Request, res: Response) => {
  precacheEngine.resume();
  res.json(precacheEngine.getStatus());
});

app.post('/api/dns/precache/stop', (_req: Request, res: Response) => {
  precacheEngine.stop();
  res.json(precacheEngine.getStatus());
});

// Majestic Million Top Domains API
app.get('/api/dns/majestic/status', (_req: Request, res: Response) => {
  res.json(majesticManager.getStatus());
});

app.post('/api/dns/majestic/sync', async (req: Request, res: Response) => {
  try {
    const { maxDomains } = req.body || {};
    const result = await majesticManager.fetchAndCacheMajesticMillion(true, maxDomains || 50000);
    res.json({
      ...result,
      status: majesticManager.getStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/dns/majestic/config', (req: Request, res: Response) => {
  const { updateIntervalDays } = req.body || {};
  if (typeof updateIntervalDays === 'number') {
    majesticManager.setUpdateInterval(updateIntervalDays);
  }
  res.json(majesticManager.getStatus());
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[AegisDNS] Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[AegisDNS] Master blocklist endpoint: http://localhost:${PORT}/api/master.txt`);
  });
}

startServer().catch((err) => {
  console.error('[AegisDNS] Failed to start server:', err);
  process.exit(1);
});
