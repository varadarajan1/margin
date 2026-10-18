import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE = 'margin_local_session';
const MAX_AGE = 60 * 60 * 24 * 7;
function password() {
  const value = process.env.MARGIN_PASSWORD;
  if (!value || value.length < 12) throw new Error('Set MARGIN_PASSWORD to a unique value of at least 12 characters.');
  return value;
}
function key() { return createHmac('sha256', password()).update('Margin local session v1').digest(); }
function sign(payload: string) { return createHmac('sha256', key()).update(payload).digest('base64url'); }
export function issueSession() {
  const expiry = Math.floor(Date.now()/1000) + MAX_AGE;
  const payload = String(expiry);
  return { value: `${payload}.${sign(payload)}`, maxAge: MAX_AGE };
}
export function verifySession(value?: string): boolean {
  if (!value) return false;
  const [expiry, signature, extra] = value.split('.');
  if (!expiry || !signature || extra || !/^\d+$/.test(expiry) || Number(expiry) <= Date.now()/1000) return false;
  const expected = Buffer.from(sign(expiry)); const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function isAuthenticated() {
  try { return verifySession((await cookies()).get(COOKIE)?.value); } catch { return false; }
}
export function sessionCookieName() { return COOKIE; }
export function passwordMatches(candidate: string) {
  const expected = Buffer.from(password());
  const actual = Buffer.from(candidate);
  const padded = Buffer.alloc(expected.length); actual.copy(padded,0,0,expected.length);
  const same = timingSafeEqual(expected,padded) && actual.length === expected.length;
  return same;
}
export function requestHasValidOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true; // SameSite=Strict cookie is the browser CSRF boundary for same-origin requests.
  try { return new URL(origin).host === request.headers.get('host'); } catch { return false; }
}
