'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type SummaryItem = {id:string;url:string;title:string|null;site_name:string|null;status:'queued'|'processing'|'ready'|'failed';error:string|null;summary_status:'unavailable';archived_at:string|null;created_at:string;updated_at:string};
type SummaryState = {status:'queued'|'processing'|'ready'|'failed'|'stale';summary_text:string|null;error:string|null;model:string|null;updated_at:string}|null;
type FullItem = SummaryItem & {content_text:string|null;summary:SummaryState;summary_provider_configured:boolean};

export function Login() {
  const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response=await fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});
      const body=await response.json();
      if (!response.ok) { setError(body.error || 'Could not sign in.'); return; }
      window.location.reload();
    } catch { setError('Could not reach Margin. Is the local server running?'); }
    finally { setBusy(false); }
  }
  return <main className="login-shell"><div className="login-card"><Brand/><p className="eyebrow">YOUR PRIVATE READING LIBRARY</p><h1>Make room for what matters.</h1><p className="muted">Sign in to your local Margin library.</p><form onSubmit={submit} className="stack"><label htmlFor="password">Local password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="primary" disabled={busy}>{busy?'Checking…':'Open my library'}</button>{error&&<p className="error" role="alert">{error}</p>}</form><p className="fineprint">Local development sign-in. This is not production-grade authentication.</p></div></main>
}

export function Library({initialItems}:{initialItems:SummaryItem[]}) {
  const [items,setItems]=useState(initialItems); const [url,setUrl]=useState(''); const [query,setQuery]=useState(''); const [showArchived,setShowArchived]=useState(false); const [notice,setNotice]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const [actionBusy,setActionBusy]=useState(false); const [summaryBusy,setSummaryBusy]=useState(false); const [summaryError,setSummaryError]=useState(''); const [selected,setSelected]=useState<FullItem|null>(null);
  const refresh=useCallback(async (search=query, archived=showArchived) => {
    const params=new URLSearchParams();if(search)params.set('q',search);if(archived)params.set('archived','true');
    const response=await fetch(`/api/items${params.size?`?${params}`:''}`,{cache:'no-store'});
    if(response.status===401){window.location.reload();return;}
    if(response.ok){const body=await response.json();setItems(body.items);}
  },[query,showArchived]);
  useEffect(()=>{const timer=setTimeout(()=>{void refresh(query,showArchived)},180);return()=>clearTimeout(timer)},[query,showArchived,refresh]);
  useEffect(()=>{const pending=items.some(item=>item.status==='queued'||item.status==='processing');if(!pending)return;const timer=setInterval(()=>void refresh(),1800);return()=>clearInterval(timer)},[items,refresh]);
  useEffect(()=>{if(!selected)return;const articlePending=selected.status==='queued'||selected.status==='processing';const summaryPending=selected.summary?.status==='queued'||selected.summary?.status==='processing';if(!articlePending&&!summaryPending)return;const id=selected.id;const timer=setInterval(()=>{void fetch(`/api/items/${encodeURIComponent(id)}`,{cache:'no-store'}).then(async response=>{if(response.status===401){window.location.reload();return}if(response.ok){const body=await response.json();setSelected(current=>current?.id===id?{...body.item,summary:body.summary,summary_provider_configured:body.summary_provider_configured}:current)}}).catch(()=>{})},1800);return()=>clearInterval(timer)},[selected?.id,selected?.status,selected?.summary?.status]);
  async function save(event:FormEvent) {
    event.preventDefault();setBusy(true);setError('');setNotice('');
    try {
      const response=await fetch('/api/items',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url})});const body=await response.json();
      if(!response.ok){setError(body.error||'Could not save this link.');return;}
      setUrl('');setSelected(null);setShowArchived(false);setNotice(body.duplicate?'Already in your library — opening the saved item.':'Saved. Margin is fetching the article in the background.');await refresh('',false);setQuery('');
      if(body.item?.id) await openItem(body.item.id);
    } catch {setError('Could not reach Margin. Your link was not confirmed as saved.');}
    finally {setBusy(false);}
  }
  async function openItem(id:string) {
    setError('');setSelected(null);
    try{const response=await fetch(`/api/items/${encodeURIComponent(id)}`,{cache:'no-store'});if(!response.ok)throw new Error('Could not open this saved item.');const body=await response.json();setSummaryError('');setSelected({...body.item,summary:body.summary,summary_provider_configured:body.summary_provider_configured});}
    catch(e){setError(e instanceof Error?e.message:'Could not open item.');}
  }
  async function retryExtraction() {
    if(!selected)return;setActionBusy(true);setError('');
    try{const response=await fetch(`/api/items/${encodeURIComponent(selected.id)}/retry`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});const body=await response.json();if(!response.ok)throw new Error(body.error||'Could not retry extraction.');setSelected({...selected,status:'queued',error:null});setNotice('Retrying article extraction…');await refresh(query,showArchived);}
    catch(e){setError(e instanceof Error?e.message:'Could not retry extraction.');}finally{setActionBusy(false);}
  }
  async function generateSummary() {
    if(!selected)return;setSummaryBusy(true);setSummaryError('');
    try{const response=await fetch(`/api/items/${encodeURIComponent(selected.id)}/summary`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});const body=await response.json();if(!response.ok)throw new Error(body.error||'Could not generate summary.');setSelected(current=>current?.id===selected.id?{...current,summary:body.summary}:current);}
    catch(e){setSummaryError(e instanceof Error?e.message:'Could not generate summary.');}finally{setSummaryBusy(false);}
  }
  async function changeArchiveState(archived:boolean) {
    if(!selected)return;setActionBusy(true);setError('');
    try{const response=await fetch(`/api/items/${encodeURIComponent(selected.id)}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({archived})});const body=await response.json();if(!response.ok)throw new Error(body.error||'Could not update article.');setSelected(null);setNotice(archived?'Article archived.':'Article restored to your reading list.');await refresh(query,showArchived);}
    catch(e){setError(e instanceof Error?e.message:'Could not update article.');}finally{setActionBusy(false);}
  }
  async function removeSelected() {
    if(!selected||!window.confirm('Permanently delete this saved article and its extracted text?'))return;setActionBusy(true);setError('');
    try{const response=await fetch(`/api/items/${encodeURIComponent(selected.id)}`,{method:'DELETE'});const body=await response.json();if(!response.ok)throw new Error(body.error||'Could not delete article.');setSelected(null);setNotice('Article and extracted text deleted.');await refresh(query,showArchived);}
    catch(e){setError(e instanceof Error?e.message:'Could not delete article.');}finally{setActionBusy(false);}
  }
  async function logout(){await fetch('/api/logout',{method:'POST'});window.location.reload();}
  return <main className="app-shell"><header className="topbar"><Brand/><button className="quiet-button" onClick={logout}>Sign out</button></header><div className="workspace"><section className="intro"><p className="eyebrow">A LITTLE SPACE TO THINK</p><h1>Save what interests you.<br/><em>Understand it deeply.</em></h1><p className="muted">Your private library for articles worth coming back to.</p></section>
    <form className="save-form" onSubmit={save}><label className="sr-only" htmlFor="article-url">Article URL</label><input id="article-url" type="url" inputMode="url" placeholder="Paste an article link…" value={url} onChange={e=>setUrl(e.target.value)} required maxLength={2048}/><button className="primary" disabled={busy||!url.trim()}>{busy?'Saving…':'Save link'}</button></form>
    <p className="helper">Article pages over HTTPS are supported. X posts, paywalled pages, videos, and podcasts are not imported in this first slice.</p>{notice&&<p className="notice" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
    <div className="content-grid"><section className="library-panel"><div className="section-heading"><div><p className="eyebrow">YOUR COLLECTION</p><h2>{showArchived?'Archive':'Reading list'} <span className="count">{items.length}</span></h2></div></div><div className="library-tabs" role="group" aria-label="Library view"><button type="button" className={!showArchived?'active':''} aria-pressed={!showArchived} onClick={()=>{setSelected(null);setQuery('');setShowArchived(false)}}>Inbox</button><button type="button" className={showArchived?'active':''} aria-pressed={showArchived} onClick={()=>{setSelected(null);setQuery('');setShowArchived(true)}}>Archive</button></div><label className="sr-only" htmlFor="search">Search your library</label><input id="search" className="search" type="search" placeholder="Search saved articles…" value={query} onChange={e=>setQuery(e.target.value)}/>
      {items.length===0?<div className="empty"><div className="empty-mark">↗</div><h3>{query?'No matching articles':showArchived?'Nothing archived yet':'Your reading list starts here'}</h3><p>{query?'Try another title or phrase.':showArchived?'Archive an article to keep it out of your inbox while preserving it in your library.':'Save an article link above. It will appear here as soon as it is safely stored.'}</p></div>:<ul className="item-list">{items.map(item=><li key={item.id}><button className={`item-card ${selected?.id===item.id?'selected':''}`} onClick={()=>void openItem(item.id)}><span className={`status-dot ${item.status}`}/><span className="item-copy"><span className="item-title">{item.title||item.url}</span><span className="item-meta">{item.site_name||new URL(item.url).hostname} · {statusText(item.status)}</span></span><span className="chevron">↗</span></button></li>)}</ul>}
    </section><section className="reader-panel" aria-live="polite">{selected?<article><div className="reader-tools"><span className={`status-pill ${selected.status}`}>{statusText(selected.status)}</span><div className="reader-actions"><a href={selected.url} target="_blank" rel="noreferrer">Original ↗</a><button type="button" disabled={actionBusy} onClick={()=>void changeArchiveState(!selected.archived_at)}>{selected.archived_at?'Restore':'Archive'}</button><button type="button" className="delete-action" disabled={actionBusy} onClick={()=>void removeSelected()}>Delete</button></div></div><p className="eyebrow">{selected.site_name||'SAVED ARTICLE'}</p><h2>{selected.title||selected.url}</h2><p className="canonical"><a href={selected.url} target="_blank" rel="noreferrer">{selected.url}</a></p>{selected.status==='queued'||selected.status==='processing'?<div className="processing"><span className="spinner"/>Fetching and extracting article text…</div>:selected.status==='failed'?<div className="fallback"><h3>We couldn’t extract this page.</h3><p>{selected.error||'The source could not be processed.'} Your saved link is still here.</p><a className="primary-link" href={selected.url} target="_blank" rel="noreferrer">Read on the original site ↗</a><button type="button" className="retry-action" disabled={actionBusy} onClick={()=>void retryExtraction()}>{actionBusy?'Retrying…':'Retry extraction'}</button></div>:<><div className="summary-box"><div className="summary-heading"><p className="eyebrow">AI SUMMARY</p>{selected.summary?.status==='queued'||selected.summary?.status==='processing'?<span className="summary-status">{selected.summary.status==='queued'?'Queued':'Generating…'}</span>:selected.summary?.status==='ready'?<span className="summary-status">Generated</span>:null}</div>{selected.summary?.status==='ready'?<div className="summary-content">{selected.summary.summary_text}</div>:selected.summary?.status==='failed'?<p>{selected.summary.error||'Summary generation failed.'}</p>:selected.summary?.status==='stale'?<p>Article text changed. Generate a fresh summary.</p>:selected.summary?.status==='queued'||selected.summary?.status==='processing'?<p>Your summary is being generated. You can leave this page; it will be saved to your library.</p>:<p>No summary yet. Generate one only when you’re ready.</p>}{selected.summary?.status!=='ready'&&selected.summary?.status!=='queued'&&selected.summary?.status!=='processing'&&(selected.summary_provider_configured?<button type="button" className="summary-action" disabled={summaryBusy} onClick={()=>void generateSummary()}>{summaryBusy?'Starting…':selected.summary?.status==='failed'?'Retry summary':'Generate summary'}</button>:<p className="summary-note">OpenAI isn’t configured. Add OPENAI_API_KEY to .env.local and restart Margin to enable summaries.</p>)}{summaryError&&<p className="error" role="alert">{summaryError}</p>}</div><div className="article-text">{selected.content_text}</div></>}</article>:<div className="reader-empty"><div className="reader-icon">M</div><h3>Your saved article, in a calmer space.</h3><p>Choose something from your list to read it here.</p><span className="summary-note">Summaries are unavailable until an AI provider is explicitly configured.</span></div>}</section></div>
    <footer><span>Margin · Local personal library</span><span>Saved content stays on this device.</span></footer></div></main>
}
function statusText(status:SummaryItem['status']){return status==='queued'?'Waiting':status==='processing'?'Processing':status==='ready'?'Ready':'Needs attention';}
function Brand(){return <a href="/" className="brand" aria-label="Margin home"><span className="brand-mark">M</span><span>margin<span className="brand-period">.</span></span></a>}
