import { isAuthenticated } from '@/lib/auth';
import { listItems } from '@/lib/db';
import { Library } from './ui';
import { Login } from './ui';
export const dynamic = 'force-dynamic';
export default async function Home() {
  if (!await isAuthenticated()) return <Login />;
  return <Library initialItems={listItems()} />;
}
