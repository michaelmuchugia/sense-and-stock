import Link from 'next/link'
import { ARTICLES } from '@/lib/articles'
export default function LearnPage(){return <main className="C pricing-page"><header className="pricing-header"><div className="hbadge">Learn</div><h1>Better questions.<br/><em>Clearer research.</em></h1><p>Understand analyst calls, rankings and the evidence behind them.</p></header><div className="home-explore">{ARTICLES.map(a=><Link key={a.slug} href={'/learn/'+a.slug}><span className="plan-tag">{a.category}</span><h2>{a.title}</h2><p>{a.summary}</p><strong>Read article →</strong></Link>)}</div></main>}
