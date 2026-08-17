'use client';
import { useEffect, useState } from 'react';
export default function WatchActions({ videoId, liked, likes, authed }: { videoId: string; liked: boolean; likes: number; authed: boolean }) {
  const [isLiked, setIsLiked] = useState(liked);
  const [count, setCount] = useState(likes);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const key = `sb_viewed_${videoId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    fetch(`/api/videos/${videoId}/view`, { method: 'POST' }).catch(() => {});
  }, [videoId]);
  const like = async () => {
    if (!authed) { window.__toast?.('Log in to like videos', true); return; }
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/videos/${videoId}/like`, { method: 'POST' });
    if (res.ok) { const j = await res.json(); setIsLiked(j.liked); setCount(c => c + (j.liked ? 1 : -1)); }
    setBusy(false);
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/watch/${videoId}`);
      window.__toast?.('Link copied to clipboard');
    } catch { window.__toast?.('Could not copy link', true); }
  };
  return (
    <>
      <button className={`pill-btn${isLiked ? ' on' : ''}`} onClick={like}>
        <span className="heart">{isLiked ? '♥' : '♡'}</span> {count.toLocaleString()}
      </button>
      <button className="pill-btn" onClick={share}>↗ Share</button>
    </>
  );
}
