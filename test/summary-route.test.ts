import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { POST } from '../app/api/items/[id]/summary/route';
import { completeJob, createItem, getArticleSummary } from '../lib/db';

vi.mock('@/lib/auth',()=>({isAuthenticated:async()=>true,requestHasValidOrigin:()=>true}));

const dirs:string[]=[];
const previous={data:process.env.MARGIN_DATA_DIR,key:process.env.OPENAI_API_KEY};
beforeEach(()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'margin-summary-route-'));dirs.push(dir);process.env.MARGIN_DATA_DIR=dir;
});
afterEach(()=>{
  const shared=globalThis as typeof globalThis & {marginDb?:{close:()=>void}};shared.marginDb?.close();delete shared.marginDb;
  if(previous.data===undefined)delete process.env.MARGIN_DATA_DIR;else process.env.MARGIN_DATA_DIR=previous.data;
  if(previous.key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous.key;
  for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});
});
function request(){return new Request('http://localhost/api/items/test-id/summary',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:'{}'});}

describe('on-demand summary route',()=>{
  it('preserves the no-key fallback and does not queue work',async()=>{
    delete process.env.OPENAI_API_KEY;
    const saved=createItem('https://example.com/article');
    const response=await POST(request(),{params:Promise.resolve({id:saved.item.id})});
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({error:expect.stringContaining('OPENAI_API_KEY')});
    expect(getArticleSummary(saved.item.id)).toBeUndefined();
  });

  it('queues only an explicit click, is idempotent, and never returns the key',async()=>{
    process.env.OPENAI_API_KEY='fake-test-key-never-a-real-secret';
    const saved=createItem('https://example.com/article');
    const articleJob=await import('../lib/db').then(db=>db.claimNextJob());
    expect(articleJob?.item_id).toBe(saved.item.id);
    completeJob(saved.item.id,{title:'Article title',siteName:'example.com',text:'Article body with key claims, evidence, and caveats.'.repeat(20)});

    const response=await POST(request(),{params:Promise.resolve({id:saved.item.id})});
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({summary:{status:'queued',summary_text:null}});
    expect(getArticleSummary(saved.item.id)?.status).toBe('queued');
    const duplicate=await POST(request(),{params:Promise.resolve({id:saved.item.id})});
    expect(duplicate.status).toBe(202);
    expect(getArticleSummary(saved.item.id)?.attempts).toBe(0);
    expect(JSON.stringify(await duplicate.json())).not.toContain('fake-test-key-never-a-real-secret');
  });
});
