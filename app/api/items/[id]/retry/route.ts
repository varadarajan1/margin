import { NextResponse } from 'next/server';
import { isAuthenticated, requestHasValidOrigin } from '@/lib/auth';
import { retryItem } from '@/lib/db';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request:Request,context:{params:Promise<{id:string}>}){
  if(!await isAuthenticated())return NextResponse.json({error:'Authentication required.'},{status:401});
  if(!requestHasValidOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const {id}=await context.params;
  if(!retryItem(id))return NextResponse.json({error:'This saved article is not available to retry.'},{status:409});
  return NextResponse.json({ok:true},{status:202});
}
