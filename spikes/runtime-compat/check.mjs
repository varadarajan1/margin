import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import * as vec from 'sqlite-vec';
import { BACKGROUND_CONTEXT as ctx } from '@earendil-works/chord/context';
import { createModels } from '@earendil-works/pi-ai/models';
import { Harness, createRegistry, defineDoc } from '@earendil-works/pi-durable';
import { openNodeSqliteStorage } from '@earendil-works/pi-durable/storage/sqlite/node';

const dir = await mkdtemp(join(tmpdir(), 'margin-check-'));
try {
  const file = join(dir, 'margin.sqlite');
  let db = new DatabaseSync(file, { allowExtension: true });
  vec.load(db);
  db.enableLoadExtension(false);
  db.exec("PRAGMA journal_mode=WAL; CREATE VIRTUAL TABLE passages USING fts5(text); CREATE VIRTUAL TABLE embeddings USING vec0(embedding float[3]);");
  db.prepare('INSERT INTO passages(rowid,text) VALUES (?,?)').run(1, 'Database indexing lecture');
  db.prepare('INSERT INTO embeddings(rowid,embedding) VALUES (?,?)').run(1n, '[1,0,0]');
  assert.equal(db.prepare("SELECT rowid FROM passages WHERE passages MATCH 'indexing'").get().rowid, 1);
  assert.equal(db.prepare('SELECT rowid FROM embeddings WHERE embedding MATCH ? AND k=1').get('[1,0,0]').rowid, 1);
  console.log('SQLite/vec versions:', db.prepare('SELECT sqlite_version() AS sqlite, vec_version() AS vec').get());
  db.close();
  db = new DatabaseSync(file, { allowExtension: true });
  vec.load(db);
  assert.equal(db.prepare('SELECT count(*) AS n FROM passages').get().n, 1);
  assert.equal(db.prepare('SELECT rowid FROM embeddings WHERE embedding MATCH ? AND k=1').get('[1,0,0]').rowid, 1);
  db.close();
  console.log('PASS: FTS5, vector nearest-neighbor query, database reopen');

  const Note = defineDoc({kind:'margin.check', version:1, scope:'conversation', history:'latest', fork:'initial', initial:()=>({text:''})});
  const agentFile = join(dir, 'agent.sqlite');
  const options = () => ({ models:createModels(), registry:createRegistry() });
  let harness = await Harness.open(await openNodeSqliteStorage(agentFile), options(), ctx);
  let root = await harness.root(ctx);
  const id = root.id;
  await root.commit(async tx => { (await tx.doc(Note, id)).text = 'persisted'; }, ctx);
  await harness.close(ctx);
  harness = await Harness.open(await openNodeSqliteStorage(agentFile), options(), ctx);
  root = await harness.root(ctx);
  assert.equal(root.id, id);
  assert.equal((await harness.snapshot(Note, id, ctx)).text, 'persisted');
  await harness.close(ctx);
  console.log('PASS: Pi Durable opens, commits state, closes, reopens same conversation and state');
  console.log('No model requests made. This is not a crash-recovery or paid-provider test.');
} finally { await rm(dir, {recursive:true, force:true}); }
