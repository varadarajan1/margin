import { NextResponse } from 'next/server';
import { isAuthenticated, requestHasValidOrigin } from '@/lib/auth';
import { deleteItem, getArticleSummary, getItem, setItemArchived } from '@/lib/db';
import { isOpenAIConfigured } from '@/lib/openai';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return NextResponse.json({error:'Authentication required.'},{status:401});
  const {id}=await context.params;
  const item=getItem(id);
  return item ? NextResponse.json({item,summary:getArticleSummary(id)??null,summary_provider_configured:isOpenAIConfigured()}) : NextResponse.json({error:'Saved item not found.'},{status:404});
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return NextResponse.json({error:'Authentication required.'},{status:401});
  if (!requestHasValidOrigin(request)) return NextResponse.json({error:'Invalid request origin.'},{status:403});
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({error:'Invalid JSON body.'},{status:400}); }
  if (typeof body !== 'object' || body === null || !('archived' in body) || typeof body.archived !== 'boolean') {
    return NextResponse.json({error:'Expected an archived boolean.'},{status:400});
  }
  const {id} = await context.params;
  if (!setItemArchived(id,body.archived)) return NextResponse.json({error:'Saved item not found.'},{status:404});
  return NextResponse.json({ok:true});
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return NextResponse.json({error:'Authentication required.'},{status:401});
  if (!requestHasValidOrigin(request)) return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const {id} = await context.params;
  if (!deleteItem(id)) return NextResponse.json({error:'Saved item not found.'},{status:404});
  return NextResponse.json({ok:true});
}
