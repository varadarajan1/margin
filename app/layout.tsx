import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'Margin — your personal reading library', description:'Save articles and come back to them when you are ready.' };
export const viewport: Viewport = { width:'device-width', initialScale:1, themeColor:'#f5f3ee' };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
