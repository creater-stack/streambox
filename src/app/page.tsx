import Link from 'next/link';
import { Fragment } from 'react';
import { prisma } from '@/lib/db';
import VideoCard from '@/components/VideoCard';
import Reveal from '@/components/Reveal';
import { videoDTO } from '@/lib/dto';

export const dynamic = 'force-dynamic';

function timeAgo(d: Date) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}
const fmtViews = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);
const inc = { user: { select: { username: true, avatarUrl: true } }, category: true, tags: { include: { tag: true } } };

export default async function Home({ searchParams }: { searchParams: { q?: string; cat?: string } }) {
  const q = searchParams.q?.trim();
  const cat = searchParams.cat;
  const [categories, trending, latest] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.video.findMany({ where: { status: 'READY' }, orderBy: { viewsCount: 'desc' }, take: 12, include: inc }),
    prisma.video.findMany({ where: { status: 'READY' }, orderBy: { publishedAt: 'desc' }, take: 24, include: inc })
  ]);
  const filtered = (q || cat)
    ? await prisma.video.findMany({
        where: {
          status: 'READY',
          ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
          ...(cat ? { category: { slug: cat } } : {})
        },
        orderBy: { publishedAt: 'desc' }, take: 48, include: inc
      })
    : null;
  const featured = trending[0];
  const isBrowsing = !!filtered;
  return (
    <>
      {isBrowsing ? (
        <section className="section" style={{ marginTop: 8 }}>
          <div className="section-head">
            <h2>{q ? `Results for "${q}"` : 'Category'}</h2>
            <span className="count">{filtered.length} videos</span>
          </div>
          {filtered.length === 0
            ? <div className="empty">Nothing here yet — try another search.</div>
            : <div className="grid">{filtered.map(v => <VideoCard key={v.id} v={videoDTO(v)} />)}</div>}
        </section>
      ) : (
        <>
          {featured && (
            <Reveal>
              <Link href={`/watch/${featured.id}`} className="featured">
                {featured.thumbPath && <img className="bgimg" src={`/api/media/${featured.thumbPath}`} alt="" />}
                <div className="fcontent">
                  <div className="kick">Trending now</div>
                  <h1>{featured.title}</h1>
                  <div className="fmeta">
                    <span>by <b style={{ color: 'var(--text)' }}>{featured.user.username}</b></span>
                    <span>{fmtViews(featured.viewsCount)} views</span>
                    <span>{timeAgo(featured.publishedAt || featured.createdAt)}</span>
                  </div>
                  <span className="btn btn-acc">▶&nbsp; Watch now</span>
                </div>
              </Link>
            </Reveal>
          )}
          <Reveal>
            <section className="section">
              <div className="section-head"><h2>Browse categories</h2></div>
              <div className="chips">
                {categories.map(c => (
                  <Link key={c.id} className="chip" href={`/?cat=${c.slug}`}>{c.name}</Link>
                ))}
              </div>
            </section>
          </Reveal>
          <Reveal>
            <section className="section">
              <div className="section-head"><h2>Trending</h2><span className="count">most watched</span></div>
              {trending.length === 0 ? <div className="empty">No videos yet. Be the first to upload!</div> : (
                <div className="rail">
                  {trending.map((v, i) => (
                    <Fragment key={v.id}>
                      <span className="rail-num">{i + 1}</span>
                      <VideoCard v={videoDTO(v)} />
                    </Fragment>
                  ))}
                </div>
              )}
            </section>
          </Reveal>
          <Reveal>
            <section className="section">
              <div className="section-head"><h2>Fresh drops</h2><span className="count">latest uploads</span></div>
              <div className="grid">{latest.map(v => <VideoCard key={v.id} v={videoDTO(v)} />)}</div>
            </section>
          </Reveal>
        </>
      )}
    </>
  );
}
