import { describe, expect, it, vi } from 'vitest';
import { validateArticleUrl, extractArticle } from '../lib/article';

describe('article URL safety',()=>{
  it('allows public HTTPS URLs only',()=>{
    expect(validateArticleUrl('https://example.com/story#part').toString()).toBe('https://example.com/story');
    for(const url of ['http://example.com','file:///etc/passwd','https://user:pass@example.com/','https://localhost/a','https://192.168.1.2/a','https://[::1]/','https://metadata.google.internal/']) {
      expect(()=>validateArticleUrl(url),url).toThrow();
    }
  });
  it('rejects a hostname with any private DNS answer',async()=>{
    await expect(extractArticle('https://example.com/story',{
      lookup:async()=>[{address:'8.8.8.8',family:4},{address:'10.0.0.3',family:4}],
      request:vi.fn(),
    })).rejects.toThrow(/private or reserved/);
  });
  it('revalidates redirects and never requests a private destination',async()=>{
    const request=vi.fn(async()=>({status:302,headers:{location:'https://127.0.0.1/admin'},body:''}));
    await expect(extractArticle('https://example.com/story',{
      lookup:async()=>[{address:'8.8.8.8',family:4}],request,
    })).rejects.toThrow(/Private and reserved/);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('extracts text and does not return source markup',async()=>{
    const body=`<!doctype html><html><head><title>Reading title</title></head><body><nav>navigation links</nav><article><h1>A considered article title</h1><p>${'This is useful article content about learning, reading and carefully preserving ideas. '.repeat(8)}</p><script>steal()</script></article></body></html>`;
    const result=await extractArticle('https://example.com/story',{
      lookup:async()=>[{address:'8.8.8.8',family:4}],
      request:async()=>({status:200,headers:{'content-type':'text/html; charset=utf-8'},body}),
    });
    expect(result.title).toBe('Reading title');
    expect(result.text).toContain('useful article content');
    expect(result.text).not.toContain('<script>');
    expect(result.text).not.toContain('steal()');
  });
  it('preserves URL safety when a supported fetch response contains little readable text',async()=>{
    await expect(extractArticle('https://example.com/story',{
      lookup:async()=>[{address:'8.8.8.8',family:4}],
      request:async()=>({status:200,headers:{'content-type':'text/html'},body:'<html><body><p>tiny</p></body></html>'}),
    })).rejects.toThrow(/Could not extract enough/);
  });
});
