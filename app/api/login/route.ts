import { NextResponse } from 'next/server';
import { issueSession, passwordMatches, requestHasValidOrigin, sessionCookieName } from '@/lib/auth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!requestHasValidOrigin(request)) return NextResponse.json({error:'Invalid request origin.'},{status:403});
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({error:'Invalid request.'},{status:400}); }
  const candidate = typeof body === 'object' && body !== null && 'password' in body && typeof body.password === 'string' ? body.password : '';
  try {
    if (!passwordMatches(candidate)) return NextResponse.json({error:'Password did not match.'},{status:401});
  } catch { return NextResponse.json({error:'Local authentication is not configured. Set MARGIN_PASSWORD.'},{status:503}); }
  const session = issueSession();
  const response = NextResponse.json({ok:true});
  response.cookies.set(sessionCookieName(),session.value,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:session.maxAge});
  return response;
}
