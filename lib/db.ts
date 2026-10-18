import 'server-only';
import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export type ItemStatus = 'queued' | 'processing' | 'ready' | 'failed';
export type ArticleSummaryStatus = 'queued' | 'processing' | 'ready' | 'failed' | 'stale';
export interface ArticleSummary {
  item_id: string; status: ArticleSummaryStatus; source_hash: string; summary_text: string | null;
  error: string | null; model: string | null; attempts: number; lease_until: string | null;
  created_at: string; updated_at: string;
}
export interface Item {
  id: string; url: string; title: string | null; site_name: string | null; status: ItemStatus;
  error: string | null; content_text: string | null; summary_status: 'unavailable';
  archived_at: string | null; created_at: string; updated_at: string;
}

const globalForDb = globalThis as typeof globalThis & { marginDb?: Database.Database };
function openDb(): Database.Database {
  const dir = path.resolve(process.env.MARGIN_DATA_DIR || '.data');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const db = new Database(path.join(dir, 'margin.sqlite'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      canonical_url TEXT NOT NULL UNIQUE,
      title TEXT,
      site_name TEXT,
      status TEXT NOT NULL CHECK(status IN ('queued','processing','ready','failed')),
      error TEXT,
      content_text TEXT,
      summary_status TEXT NOT NULL DEFAULT 'unavailable' CHECK(summary_status = 'unavailable'),
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS item_search USING fts5(title, content_text, content='items', content_rowid='rowid', tokenize='unicode61');
    CREATE TRIGGER IF NOT EXISTS items_search_insert AFTER INSERT ON items BEGIN
      INSERT INTO item_search(rowid, title, content_text) VALUES (new.rowid, coalesce(new.title,''), coalesce(new.content_text,''));
    END;
    CREATE TRIGGER IF NOT EXISTS items_search_update AFTER UPDATE OF title, content_text ON items BEGIN
      INSERT INTO item_search(item_search, rowid, title, content_text) VALUES ('delete', old.rowid, coalesce(old.title,''), coalesce(old.content_text,''));
      INSERT INTO item_search(rowid, title, content_text) VALUES (new.rowid, coalesce(new.title,''), coalesce(new.content_text,''));
    END;
    CREATE TRIGGER IF NOT EXISTS items_search_delete AFTER DELETE ON items BEGIN
      INSERT INTO item_search(item_search, rowid, title, content_text) VALUES ('delete', old.rowid, coalesce(old.title,''), coalesce(old.content_text,''));
    END;
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('queued','processing','done','failed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      lease_until TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS article_summaries (
      item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('queued','processing','ready','failed','stale')),
      source_hash TEXT NOT NULL,
      summary_text TEXT,
      error TEXT,
      model TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      lease_until TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const itemColumns = db.pragma('table_info(items)') as Array<{name:string}>;
  if (!itemColumns.some(column => column.name === 'archived_at')) db.exec('ALTER TABLE items ADD COLUMN archived_at TEXT');
  return db;
}

export function getDb(): Database.Database {
  return (globalForDb.marginDb ??= openDb());
}

export function canonicalizeUrl(raw: string): string {
  const u = new URL(raw);
  u.hash = '';
  u.hostname = u.hostname.toLowerCase();
  if ((u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80')) u.port = '';
  // Keep all query parameters: some publishers use meaningful article IDs there.
  return u.toString();
}

export function createItem(rawUrl: string): { item: Item; duplicate: boolean } {
  const db = getDb();
  const canonical = canonicalizeUrl(rawUrl);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  return db.transaction(() => {
    const inserted = db.prepare(`INSERT INTO items(id,url,canonical_url,status,created_at,updated_at) VALUES(?,?,?,'queued',?,?) ON CONFLICT(canonical_url) DO NOTHING`).run(id, rawUrl, canonical, now, now);
    if (inserted.changes === 0) {
      const prior = db.prepare('SELECT * FROM items WHERE canonical_url=?').get(canonical) as Item;
      return { item: prior, duplicate: true };
    }
    db.prepare(`INSERT INTO jobs(id,item_id,status,created_at,updated_at) VALUES(?,?,'queued',?,?)`).run(crypto.randomUUID(), id, now, now);
    return { item: db.prepare('SELECT * FROM items WHERE id=?').get(id) as Item, duplicate: false };
  })();
}

export type ItemSummary = Omit<Item, 'content_text'>;
export function listItems(query = '', archived = false): ItemSummary[] {
  const db = getDb();
  const columns = 'items.id,items.url,items.title,items.site_name,items.status,items.error,items.summary_status,items.archived_at,items.created_at,items.updated_at';
  const archiveFilter = archived ? 'IS NOT NULL' : 'IS NULL';
  if (!query.trim()) return db.prepare(`SELECT ${columns} FROM items WHERE archived_at ${archiveFilter} ORDER BY created_at DESC LIMIT 200`).all() as ItemSummary[];
  // FTS syntax is user-controlled; bind it and return no results for malformed operators.
  try {
    return db.prepare(`SELECT ${columns} FROM items JOIN item_search ON item_search.rowid=items.rowid WHERE items.archived_at ${archiveFilter} AND item_search MATCH ? ORDER BY rank LIMIT 100`).all(query.trim()) as ItemSummary[];
  } catch {
    return [];
  }
}

export function getItem(id: string): Item | undefined {
  return getDb().prepare('SELECT * FROM items WHERE id=?').get(id) as Item | undefined;
}

function contentHash(text: string): string { return createHash('sha256').update(text).digest('hex'); }

export function getArticleSummary(itemId: string): ArticleSummary | undefined {
  return getDb().prepare('SELECT * FROM article_summaries WHERE item_id=?').get(itemId) as ArticleSummary | undefined;
}

export function requestArticleSummary(itemId: string): ArticleSummary | undefined {
  const db=getDb();
  return db.transaction(() => {
    const item=db.prepare("SELECT status,content_text FROM items WHERE id=?").get(itemId) as {status:ItemStatus;content_text:string|null}|undefined;
    if (!item || item.status!=='ready' || !item.content_text) return undefined;
    const hash=contentHash(item.content_text);const now=new Date().toISOString();
    const current=db.prepare('SELECT * FROM article_summaries WHERE item_id=?').get(itemId) as ArticleSummary|undefined;
    if (current?.source_hash===hash && ['queued','processing','ready'].includes(current.status)) return current;
    db.prepare(`INSERT INTO article_summaries(item_id,status,source_hash,summary_text,error,model,attempts,lease_until,created_at,updated_at)
      VALUES(?,'queued',?,NULL,NULL,NULL,0,NULL,?,?)
      ON CONFLICT(item_id) DO UPDATE SET status='queued',source_hash=excluded.source_hash,summary_text=NULL,error=NULL,model=NULL,attempts=0,lease_until=NULL,updated_at=excluded.updated_at`).run(itemId,hash,now,now);
    return db.prepare('SELECT * FROM article_summaries WHERE item_id=?').get(itemId) as ArticleSummary;
  })();
}

export interface ArticleSummaryJob { item_id:string; source_hash:string; title:string|null; url:string; content_text:string; attempts:number; }
export function claimArticleSummary(): ArticleSummaryJob|undefined {
  const db=getDb();const now=new Date().toISOString();
  return db.transaction(() => {
    const job=db.prepare(`SELECT s.item_id,s.source_hash,i.title,i.url,i.content_text,s.attempts FROM article_summaries s JOIN items i ON i.id=s.item_id WHERE s.status='queued' OR (s.status='processing' AND (s.lease_until IS NULL OR s.lease_until<=?)) ORDER BY s.created_at LIMIT 1`).get(now) as ArticleSummaryJob|undefined;
    if(!job)return undefined;
    db.prepare("UPDATE article_summaries SET status='processing',attempts=attempts+1,lease_until=?,error=NULL,updated_at=? WHERE item_id=?").run(new Date(Date.now()+5*60_000).toISOString(),now,job.item_id);
    return {...job,attempts:job.attempts+1};
  })();
}

export function completeArticleSummary(itemId:string,sourceHash:string,text:string,model:string):boolean {
  const now=new Date().toISOString();
  return getDb().prepare("UPDATE article_summaries SET status='ready',summary_text=?,error=NULL,model=?,lease_until=NULL,updated_at=? WHERE item_id=? AND source_hash=? AND status='processing'").run(text.slice(0,20_000),model,now,itemId,sourceHash).changes>0;
}

export function failArticleSummary(itemId:string,sourceHash:string,message:string):void {
  const now=new Date().toISOString();
  getDb().prepare("UPDATE article_summaries SET status='failed',summary_text=NULL,error=?,lease_until=NULL,updated_at=? WHERE item_id=? AND source_hash=? AND status='processing'").run(message.slice(0,500),now,itemId,sourceHash);
}

export function setItemArchived(id: string, archived: boolean): boolean {
  const archivedAt = archived ? new Date().toISOString() : null;
  return getDb().prepare('UPDATE items SET archived_at=?,updated_at=? WHERE id=?').run(archivedAt,new Date().toISOString(),id).changes > 0;
}

export function deleteItem(id: string): boolean {
  return getDb().prepare('DELETE FROM items WHERE id=?').run(id).changes > 0;
}

export function claimNextJob(): { id: string; item_id: string; attempts: number } | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  return db.transaction(() => {
    const job = db.prepare(`SELECT * FROM jobs WHERE status='queued' OR (status='processing' AND (lease_until IS NULL OR lease_until<=?)) ORDER BY created_at LIMIT 1`).get(now) as { id: string; item_id: string; attempts: number } | undefined;
    if (!job) return undefined;
    db.prepare(`UPDATE jobs SET status='processing',attempts=attempts+1,lease_until=?,updated_at=? WHERE id=?`).run(new Date(Date.now()+5*60_000).toISOString(), now, job.id);
    db.prepare(`UPDATE items SET status='processing',error=NULL,updated_at=? WHERE id=?`).run(now, job.item_id);
    return { ...job, attempts: job.attempts + 1 };
  })();
}

export function completeJob(itemId: string, result: { title: string; siteName: string; text: string }): void {
  const db = getDb(); const now = new Date().toISOString(); const hash=contentHash(result.text);
  db.transaction(() => {
    db.prepare(`UPDATE items SET title=?,site_name=?,content_text=?,status='ready',error=NULL,updated_at=? WHERE id=?`).run(result.title, result.siteName, result.text, now, itemId);
    db.prepare("UPDATE article_summaries SET status='stale',source_hash=?,summary_text=NULL,error='Article text changed. Generate a fresh summary.',lease_until=NULL,updated_at=? WHERE item_id=? AND source_hash<>?").run(hash,now,itemId,hash);
    db.prepare(`UPDATE jobs SET status='done',lease_until=NULL,updated_at=? WHERE item_id=?`).run(now, itemId);
  })();
}

export function retryItem(id: string): boolean {
  const db=getDb();const now=new Date().toISOString();
  return db.transaction(()=>{
    const changed=db.prepare("UPDATE items SET status='queued',error=NULL,updated_at=? WHERE id=? AND status='failed'").run(now,id).changes>0;
    if(!changed)return false;
    db.prepare("UPDATE jobs SET status='queued',attempts=0,lease_until=NULL,updated_at=? WHERE item_id=?").run(now,id);
    return true;
  })();
}

export function failJob(itemId: string, message: string): void {
  const db = getDb(); const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare(`UPDATE items SET status='failed',error=?,updated_at=? WHERE id=?`).run(message.slice(0, 300), now, itemId);
    db.prepare(`UPDATE jobs SET status='failed',lease_until=NULL,updated_at=? WHERE item_id=?`).run(now, itemId);
  })();
}
