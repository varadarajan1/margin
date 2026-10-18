import { NextResponse } from 'next/server';
import { isAuthenticated, requestHasValidOrigin } from '@/lib/auth';
import { createItem, listItems } from '@/lib/db';
import { validateArticleUrl } from '@/lib/article';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!await isAuthenticated()) return NextResponse.json({error:'Authentication required.'},{status:401});
  const params = new URL(request.url).searchParams;
  const q = params.get('q')?.slice(0,200) ?? '';
  const archived = params.get('archived') === 'true';
  return NextResponse.json({items:listItems(q,archived)});
}
export async function POST(request: Request) {
  if (!await isAuthenticated()) return NextResponse.json({error:'Authentication required.'},{status:401});
  if (!requestHasValidOrigin(request)) return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({error:'Invalid JSON body.'},{status:400});
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 10_000) { await reader.cancel(); return NextResponse.json({error:'Request is too large.'},{status:413}); }
      chunks.push(value);
    }
  } catch { return NextResponse.json({error:'Invalid JSON body.'},{status:400}); }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks.map(chunk=>Buffer.from(chunk))).toString('utf8')); }
  catch { return NextResponse.json({error:'Invalid JSON body.'},{status:400}); }
  const url = typeof body === 'object' && body !== null && 'url' in body && typeof body.url === 'string' ? body.url.trim() : '';
  if (url.length > 2048) return NextResponse.json({error:'URL is too long.'},{status:400});
  try {
    const valid = validateArticleUrl(url);
    const result = createItem(valid.toString());
    return NextResponse.json(result,{status:result.duplicate?200:202});
  } catch (error) {
    return NextResponse.json({error:error instanceof Error ? error.message : 'Could not save this URL.'},{status:400});
  }
}
