/**
 * High-performance DNS Blocklist & Hosts parser.
 * Handles standard hosts, AdGuard/Adblock Plus syntax, and raw domain lists.
 */

const LOCAL_DOMAINS = new Set([
  'localhost',
  'localhost.localdomain',
  'local',
  'broadcasthost',
  'ip6-localhost',
  'ip6-loopback',
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  'loopback',
]);

const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function cleanAndValidateDomain(raw: string): string | null {
  if (!raw) return null;
  let domain = raw.trim().toLowerCase();

  // Strip trailing period if any
  if (domain.endsWith('.')) {
    domain = domain.slice(0, -1);
  }

  // Strip port if accidentally included (e.g., domain.com:80)
  if (domain.includes(':') && !domain.includes('::')) {
    domain = domain.split(':')[0];
  }

  if (LOCAL_DOMAINS.has(domain)) return null;

  // Verify valid domain format
  if (DOMAIN_REGEX.test(domain) && domain.length <= 253) {
    return domain;
  }

  return null;
}

export function parseBlocklistContent(content: string): Set<string> {
  const domains = new Set<string>();
  if (!content) return domains;

  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    // Skip comment lines
    const firstChar = line[0];
    if (firstChar === '#' || firstChar === '!' || firstChar === ';' || (firstChar === '/' && line[1] === '/')) {
      continue;
    }

    // Strip inline comments if present (except if inside quotes or AdGuard regex)
    const hashIdx = line.indexOf('#');
    if (hashIdx !== -1) {
      line = line.substring(0, hashIdx).trim();
    }
    const exclIdx = line.indexOf('!');
    if (exclIdx !== -1 && !line.startsWith('||')) {
      line = line.substring(0, exclIdx).trim();
    }

    if (!line) continue;

    // Case 1: AdGuard / Adblock Plus syntax: ||domain.com^ or ||domain.com^$modifier
    if (line.startsWith('||')) {
      let rule = line.substring(2);
      const caretIdx = rule.indexOf('^');
      if (caretIdx !== -1) {
        rule = rule.substring(0, caretIdx);
      }
      const slashIdx = rule.indexOf('/');
      if (slashIdx !== -1) {
        rule = rule.substring(0, slashIdx);
      }
      const valid = cleanAndValidateDomain(rule);
      if (valid) {
        domains.add(valid);
      }
      continue;
    }

    // Case 2: Standard /etc/hosts format: IP domain [aliases...]
    // E.g. "0.0.0.0 example.com" or "127.0.0.1  ad.example.com  tracker.example.com"
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const ipCandidate = parts[0];
      if (
        ipCandidate === '0.0.0.0' ||
        ipCandidate === '127.0.0.1' ||
        ipCandidate === '::1' ||
        ipCandidate === '::'
      ) {
        for (let p = 1; p < parts.length; p++) {
          const valid = cleanAndValidateDomain(parts[p]);
          if (valid) {
            domains.add(valid);
          }
        }
        continue;
      }
    }

    // Case 3: Raw domain list (one domain per line)
    // Might have trailing spaces or tags
    const firstToken = parts[0];
    const valid = cleanAndValidateDomain(firstToken);
    if (valid) {
      domains.add(valid);
    }
  }

  return domains;
}

import { OutputFormat } from '../types/blocklist';

/**
 * Format domain according to target output specification
 */
export function formatDomain(
  domain: string,
  format: OutputFormat,
  enableIpv6: boolean = true
): string {
  switch (format) {
    case 'adguard':
      return `||${domain}^`;

    case 'pihole':
    case 'hosts':
      if (enableIpv6) {
        return `0.0.0.0 ${domain}\n:: ${domain}`;
      }
      return `0.0.0.0 ${domain}`;

    case 'rpz':
      // Response Policy Zone format
      return `${domain} CNAME .\n*.${domain} CNAME .`;

    case 'dnsmasq':
      return `address=/${domain}/0.0.0.0`;

    case 'unbound':
      return `local-zone: "${domain}" static`;

    case 'wildcard':
      return `*.${domain}`;

    case 'domains':
    default:
      return domain;
  }
}
