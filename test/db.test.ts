import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dirs:string[]=[];
afterEach(()=>{const shared=globalThis as typeof globalThis & {marginDb?:{close:()=>void}};shared.marginDb?.close();delete shared.marginDb;for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});

describe('durable article records',()=>{
  it('persists item/job states, deduplicates canonical URLs, and indexes searchable text',async()=>{
    const dir=mkdtempSync(path.join(tmpdir(),'margin-db-'));dirs.push(dir);
    process.env.MARGIN_DATA_DIR=dir;
    const dbModule=await import('../lib/db');
    const saved=dbModule.createItem('https://example.com/story?edition=one#intro');
    expect(saved.duplicate).toBe(false);
    expect(saved.item.status).toBe('queued');
    const duplicate=dbModule.createItem('https://EXAMPLE.com/story?edition=one');
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.item.id).toBe(saved.item.id);
    const job=dbModule.claimNextJob();
    expect(job?.item_id).toBe(saved.item.id);
    expect(dbModule.getItem(saved.item.id)?.status).toBe('processing');
    // Opening a second app/worker connection must not steal a non-expired lease.
    const shared=globalThis as typeof globalThis & {marginDb?:{close:()=>void}};
    shared.marginDb?.close();delete shared.marginDb;
    expect(dbModule.getItem(saved.item.id)?.status).toBe('processing');
    expect(dbModule.claimNextJob()).toBeUndefined();
    dbModule.completeJob(saved.item.id,{title:'A searchable headline',siteName:'example.com',text:'This article explains indexing and searchable concepts.'});
    expect(dbModule.getItem(saved.item.id)?.status).toBe('ready');
    expect(dbModule.listItems('indexing')[0]?.id).toBe(saved.item.id);

    expect(dbModule.getArticleSummary(saved.item.id)).toBeUndefined();
    const requested=dbModule.requestArticleSummary(saved.item.id);
    expect(requested?.status).toBe('queued');
    const summaryJob=dbModule.claimArticleSummary();
    expect(summaryJob?.item_id).toBe(saved.item.id);
    expect(summaryJob?.content_text).toContain('searchable concepts');
    expect(dbModule.claimArticleSummary()).toBeUndefined();
    expect(dbModule.completeArticleSummary(saved.item.id,summaryJob!.source_hash,'Overview\\n- Evidence\\n- Caveat','test-model')).toBe(true);
    expect(dbModule.getArticleSummary(saved.item.id)).toMatchObject({status:'ready',summary_text:'Overview\\n- Evidence\\n- Caveat',model:'test-model'});
    const summaryHandle=globalThis as typeof globalThis & {marginDb?:{close:()=>void}};
    summaryHandle.marginDb?.close();delete summaryHandle.marginDb;
    expect(dbModule.getArticleSummary(saved.item.id)?.summary_text).toBe('Overview\\n- Evidence\\n- Caveat');

    dbModule.failJob(saved.item.id,'Temporary extraction error');
    expect(dbModule.getItem(saved.item.id)?.status).toBe('failed');
    expect(dbModule.retryItem(saved.item.id)).toBe(true);
    expect(dbModule.getItem(saved.item.id)?.status).toBe('queued');
    expect(dbModule.claimNextJob()?.item_id).toBe(saved.item.id);
    expect(dbModule.retryItem(saved.item.id)).toBe(false);

    expect(dbModule.setItemArchived(saved.item.id,true)).toBe(true);
    expect(dbModule.listItems()).toHaveLength(0);
    expect(dbModule.listItems('indexing',true)[0]?.id).toBe(saved.item.id);
    expect(dbModule.setItemArchived(saved.item.id,false)).toBe(true);
    expect(dbModule.listItems()).toHaveLength(1);
    expect(dbModule.deleteItem(saved.item.id)).toBe(true);
    expect(dbModule.getItem(saved.item.id)).toBeUndefined();
    expect(dbModule.getArticleSummary(saved.item.id)).toBeUndefined();
    expect(dbModule.listItems('indexing')).toHaveLength(0);
    expect(dbModule.deleteItem(saved.item.id)).toBe(false);
  });
});
