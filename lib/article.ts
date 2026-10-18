import 'server-only';
import { lookup as dnsLookup } from 'node:dns/promises';
import https from 'node:https';
import ipaddr from 'ipaddr.js';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

type Address = { address: string; family: number };
type Dependencies = {
  lookup?: (hostname: string) => Promise<Address[]>;
  request?: (url: URL, address: Address, timeoutMs: number, maxBytes: number) => Promise<{ status: number; headers: Record<string,string | string[] | undefined>; body: string }>;
};
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 8_000;

function publicIp(value: string): boolean {
  try {
    const address = ipaddr.process(value);
    return address.range() === 'unicast';
  } catch { return false; }
}

export function validateArticleUrl(input: string): URL {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error('Enter a valid article URL.'); }
  if (url.protocol !== 'https:') throw new Error('Only HTTPS article URLs are supported.');
  if (url.username || url.password) throw new Error('URLs containing credentials are not allowed.');
  if (!url.hostname || url.hostname.endsWith('.') || url.hostname.includes('%')) throw new Error('This hostname is not supported.');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Local and internal network addresses are not allowed.');
  }
  if (ipaddr.isValid(host) && !publicIp(host)) throw new Error('Private and reserved IP addresses are not allowed.');
  url.hash = '';
  return url;
}

async function resolvePublic(hostname: string, lookup: (hostname: string) => Promise<Address[]>): Promise<Address> {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (ipaddr.isValid(host)) {
    if (!publicIp(host)) throw new Error('Private and reserved IP addresses are not allowed.');
    return { address: host, family: ipaddr.parse(host).kind() === 'ipv4' ? 4 : 6 };
  }
  const addresses = await lookup(host);
  if (!addresses.length || addresses.some(a => !publicIp(a.address))) throw new Error('The hostname resolves to a private or reserved address.');
  return addresses[0];
}

async function pinnedHttpsRequest(url: URL, address: Address, timeoutMs: number, maxBytes: number) {
  return new Promise<{status:number; headers:Record<string,string|string[]|undefined>; body:string}>((resolve,reject) => {
    const request = https.request(url, {
      method: 'GET',
      headers: { 'user-agent': 'Margin/0.1 (personal reading library)', accept: 'text/html,application/xhtml+xml', 'accept-encoding': 'identity' },
      agent: false,
      lookup: (_hostname, options, callback) => {
        // Node may request all DNS answers for Happy Eyeballs. Our validated pin must
        // satisfy the callback's `all` result shape or it treats the address as missing.
        if (typeof options === 'object' && options !== null && 'all' in options && options.all) {
          callback(null, [{ address: address.address, family: address.family }]);
        } else {
          callback(null, address.address, address.family);
        }
      },
      servername: url.hostname.replace(/^\[|\]$/g, ''),
    }, response => {
      const status = response.statusCode ?? 0;
      const headers = response.headers as Record<string,string|string[]|undefined>;
      if ([301,302,303,307,308].includes(status)) { response.resume(); resolve({status,headers,body:''}); return; }
      const type = String(headers['content-type'] ?? '').toLowerCase();
      if (!type.includes('text/html') && !type.includes('application/xhtml+xml')) { response.resume(); reject(new Error('This link did not return an HTML article.')); return; }
      const chunks: Buffer[] = []; let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > maxBytes) { request.destroy(new Error('Article page is larger than the 2 MB limit.')); return; }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({status,headers,body:Buffer.concat(chunks).toString('utf8')}));
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error('The article request timed out.')));
    request.on('error', reject);
    request.end();
  });
}

export async function extractArticle(rawUrl: string, deps: Dependencies = {}) {
  const lookup = deps.lookup ?? (async hostname => await dnsLookup(hostname, { all: true, verbatim: true }));
  const request = deps.request ?? pinnedHttpsRequest;
  let current = validateArticleUrl(rawUrl);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const address = await resolvePublic(current.hostname, lookup);
    const response = await request(current, address, TIMEOUT_MS, MAX_BYTES);
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.location;
      if (typeof location !== 'string') throw new Error('The article redirected without a usable destination.');
      if (redirects === MAX_REDIRECTS) throw new Error('Too many redirects while fetching this article.');
      current = validateArticleUrl(new URL(location, current).toString());
      continue;
    }
    if (response.status < 200 || response.status >= 300) throw new Error(`The article site returned HTTP ${response.status}.`);
    const dom = new JSDOM(response.body, { url: current.toString() });
    try {
      const parsed = new Readability(dom.window.document, { charThreshold: 100 }).parse();
      const title = (parsed?.title || dom.window.document.title || current.hostname).replace(/\s+/g,' ').trim().slice(0,300);
      // Store and render plain text only. React escapes text; source HTML is never returned to the browser.
      const text = (parsed?.textContent || '').replace(/\u00a0/g,' ').replace(/[\t ]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim().slice(0, 500_000);
      if (text.length < 100) throw new Error('Could not extract enough readable article text. The original link is still saved.');
      return { title, siteName: current.hostname, text };
    } finally { dom.window.close(); }
  }
  throw new Error('Could not fetch this article.');
}
