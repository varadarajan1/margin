import { NextResponse } from 'next/server';
import { requestHasValidOrigin, sessionCookieName } from '@/lib/auth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!requestHasValidOrigin(request)) return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const response = NextResponse.json({ok:true});
  response.cookies.set(sessionCookieName(),'',{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0});
  return response;
}
