import { createRequire } from 'node:module';
import { claimArticleSummary, claimNextJob, completeArticleSummary, completeJob, failArticleSummary, failJob, getItem } from '../lib/db';

const { loadEnvConfig } = createRequire(import.meta.url)('@next/env') as typeof import('@next/env');
loadEnvConfig(process.cwd());
import { extractArticle } from '../lib/article';
import { generateArticleSummary, OpenAIProviderError } from '../lib/openai';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let stopped = false;
for (const signal of ['SIGINT','SIGTERM'] as const) process.on(signal, () => { stopped = true; });

async function main() {
  console.log('Margin worker started. Article extraction is local; summaries run only when explicitly requested.');
  while (!stopped) {
    const job = claimNextJob();
    if (job) {
      try {
        const item = getItem(job.item_id);
        if (!item) continue;
        const article = await extractArticle(item.url);
        completeJob(item.id, article);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Article extraction failed.';
        failJob(job.item_id, message);
        console.warn(`Article processing failed for item ${job.item_id}: ${message}`);
      }
      continue;
    }
    const summaryJob=claimArticleSummary();
    if(!summaryJob){await delay(1000);continue;}
    try{
      const summary=await generateArticleSummary({title:summaryJob.title,url:summaryJob.url,text:summaryJob.content_text});
      completeArticleSummary(summaryJob.item_id,summaryJob.source_hash,summary.text,summary.model);
    }catch(error){
      const message=error instanceof OpenAIProviderError?error.message:'Could not generate a summary. Check the server logs and try again.';
      failArticleSummary(summaryJob.item_id,summaryJob.source_hash,message);
      console.warn(`Summary generation failed for item ${summaryJob.item_id}: ${message}`);
    }
  }
}
main().catch(error => { console.error('Margin worker stopped unexpectedly.', error); process.exitCode=1; });
