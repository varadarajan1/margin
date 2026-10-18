import { NextResponse } from 'next/server';
import { isAuthenticated, requestHasValidOrigin } from '@/lib/auth';
import { getItem, requestArticleSummary } from '@/lib/db';
import { isOpenAIConfigured } from '@/lib/openai';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request:Request,context:{params:Promise<{id:string}>}){
  if(!await isAuthenticated())return NextResponse.json({error:'Authentication required.'},{status:401});
  if(!requestHasValidOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
  if(!isOpenAIConfigured())return NextResponse.json({error:'OpenAI is not configured. Add OPENAI_API_KEY to .env.local, restart Margin, and try again.'},{status:503});
  const {id}=await context.params;
  const item=getItem(id);
  if(!item)return NextResponse.json({error:'Saved item not found.'},{status:404});
  if(item.status!=='ready'||!item.content_text)return NextResponse.json({error:'Wait until article extraction is complete before generating a summary.'},{status:409});
  const summary=requestArticleSummary(id);
  if(!summary)return NextResponse.json({error:'Article text is not available for summarization.'},{status:409});
  const status=summary.status==='ready'?200:202;
  return NextResponse.json({summary:{status:summary.status,summary_text:summary.summary_text,error:summary.error,model:summary.model,updated_at:summary.updated_at}},{status});
}
