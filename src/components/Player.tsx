'use client';
import Hls from 'hls.js';
import { useCallback, useEffect, useRef, useState } from 'react';

type Level = { height: number; index: number; bitrate: number };
function fmt(s: number) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60), ss = Math.floor(s % 60), h = Math.floor(m / 60);
  return h ? `${h}:${String(m % 60).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
}

export default function Player({ src, poster }: { src: string; poster?: string | null }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideT = useRef<any>(null);
  const mediaRetried = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [dur, setDur] = useState(0);
  const [cur, setCur] = useState(0);
  const [buf, setBuf] = useState(0);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [levels, setLevels] = useState<Level[]>([]);
  const [qi, setQi] = useState(-1);
  const [dataSaver, setDataSaver] = useState(false);
  const [menu, setMenu] = useState<'' | 'quality' | 'speed'>('');
  const [err, setErr] = useState<string | null>(null);
  const [hideBar, setHideBar] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    setErr(null); setBuffering(true); setLevels([]); mediaRetried.current = false;
    const saved = localStorage.getItem('sb_datasaver') === '1';
    setDataSaver(saved);
    if (Hls.isSupported()) {
      const h = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 30, abrEwmaDefaultEstimate: saved ? 450000 : 2500000 });
      hlsRef.current = h;
      h.loadSource(src);
      h.attachMedia(v);
      h.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(h.levels.map((l, i) => ({ height: l.height, index: i, bitrate: l.bitrate })));
        if (saved) { let cap = -1; h.levels.forEach((l, i) => { if (l.height <= 480) cap = i; }); h.autoLevelCapping = cap; }
        setBuffering(false);
      });
      h.on(Hls.Events.ERROR, (_e, d) => {
        if (!d.fatal) return;
        if (d.type === Hls.ErrorTypes.NETWORK_ERROR) { setErr('Network hiccup — retrying…'); h.startLoad(); setTimeout(() => setErr(null), 1500); }
        else if (d.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaRetried.current) { mediaRetried.current = true; h.recoverMediaError(); }
        else setErr('Playback failed.');
      });
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = src; setBuffering(false);
    } else { setErr('HLS is not supported in this browser.'); setBuffering(false); }
    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [src, nonce]);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const onTime = () => {
      setCur(v.currentTime); setDur(v.duration || 0);
      try { const b = v.buffered; if (b.length) setBuf(b.end(b.length - 1)); } catch {}
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWait = () => setBuffering(true);
    const onOk = () => setBuffering(false);
    const onVol = () => { setVol(v.volume); setMuted(v.muted); };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('durationchange', onTime);
    v.addEventListener('progress', onTime);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('waiting', onWait);
    v.addEventListener('playing', onOk);
    v.addEventListener('canplay', onOk);
    v.addEventListener('volumechange', onVol);
    return () => {
      v.removeEventListener('timeupdate', onTime); v.removeEventListener('durationchange', onTime);
      v.removeEventListener('progress', onTime); v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause); v.removeEventListener('waiting', onWait);
      v.removeEventListener('playing', onOk); v.removeEventListener('canplay', onOk);
      v.removeEventListener('volumechange', onVol);
    };
  }, [nonce]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) v.play().catch(() => setErr('Tap play to start')); else v.pause();
  }, []);

  const seekTo = (clientX: number, el: HTMLElement) => {
    const v = videoRef.current; if (!v || !dur) return;
    const r = el.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * dur;
  };

  const pickQuality = (idx: number) => { const h = hlsRef.current; setQi(idx); if (h) h.currentLevel = idx; setMenu(''); };

  const toggleSaver = () => {
    const on = !dataSaver;
    setDataSaver(on);
    localStorage.setItem('sb_datasaver', on ? '1' : '0');
    const h = hlsRef.current;
    if (h) {
      if (on) { let cap = -1; h.levels.forEach((l, i) => { if (l.height <= 480) cap = i; }); h.autoLevelCapping = cap; if (h.currentLevel > cap && h.currentLevel >= 0) { h.currentLevel = -1; setQi(-1); } }
      else h.autoLevelCapping = -1;
      h.config.abrEwmaDefaultEstimate = on ? 450000 : 2500000;
    }
    window.__toast?.(on ? 'Data Saver ON — low-bitrate streams' : 'Data Saver off');
  };

  const toggleFS = () => {
    const el = boxRef.current; if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const togglePiP = async () => {
    const v = videoRef.current as any; if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch { window.__toast?.('PiP not available here', true); }
  };

  const poke = () => {
    setHideBar(false);
    clearTimeout(hideT.current);
    if (playing) hideT.current = setTimeout(() => { setHideBar(true); setMenu(''); }, 2600);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const v = videoRef.current; if (!v) return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'ArrowRight') v.currentTime = Math.min(dur, v.currentTime + 5);
    else if (e.key === 'ArrowLeft') v.currentTime = Math.max(0, v.currentTime - 5);
    else if (e.key === 'm') v.muted = !v.muted;
    else if (e.key === 'f') toggleFS();
    poke();
  };

  const sortedLevels = [...levels].sort((a, b) => b.height - a.height);
  const curLevel = sortedLevels.find(l => l.index === qi);
  const curLabel = qi === -1 || !curLevel ? 'Auto' : `${curLevel.height}p`;

  return (
    <div className="player" ref={boxRef} tabIndex={0} onKeyDown={onKey} onMouseMove={poke} onMouseLeave={() => playing && setHideBar(true)}>
      <video ref={videoRef} poster={poster || undefined} playsInline onClick={togglePlay} onDoubleClick={toggleFS} />
      {!playing && !err && !buffering && (
        <button className="p-bigplay" onClick={togglePlay} aria-label="Play">
          <span><svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></span>
        </button>
      )}
      {buffering && !err && <div className="p-spin"><span /></div>}
      {err && (
        <div className="p-err">
          <div>
            <p style={{ fontFamily: 'var(--fd)', fontWeight: 600, marginBottom: 10 }}>{err}</p>
            <button className="btn btn-acc btn-sm" onClick={() => { setErr(null); setNonce(n => n + 1); }}>Retry</button>
          </div>
        </div>
      )}
      <div className={`p-bar${hideBar ? ' hide' : ''}`}>
        <div className="p-seek" onClick={e => seekTo(e.clientX, e.currentTarget)}>
          <div className="track">
            <div className="buf" style={{ width: dur ? `${(buf / dur) * 100}%` : 0 }} />
            <div className="played" style={{ width: dur ? `${(cur / dur) * 100}%` : 0 }} />
          </div>
        </div>
        <div className="p-ctrl">
          <button className="p-btn" onClick={togglePlay} aria-label="Play/Pause">
            {playing
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
          </button>
          <div className="p-volgrp" style={{ display: 'flex', alignItems: 'center' }}>
            <button className="p-btn" onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted; }} aria-label="Mute">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.47 4.47 0 0 0 16.5 12z"/></svg>
            </button>
            <div className="p-vol">
              <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : vol}
                onChange={e => { const v = videoRef.current; if (!v) return; const x = Number(e.target.value); v.volume = x; v.muted = x === 0; }} />
            </div>
          </div>
          <span className="p-time">{fmt(cur)} / {fmt(dur)}</span>
          <div className="p-spacer" />
          <button className={`p-btn${dataSaver ? ' toggled' : ''}`} onClick={toggleSaver} title="Data Saver" aria-label="Data Saver">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7 3 2.7 5.1 0 8.4L12 21 24 8.4C21.3 5.1 17 3 12 3z"/></svg>
          </button>
          <button className="p-btn" onClick={() => setMenu(m => m === 'speed' ? '' : 'speed')} aria-label="Speed" style={{ fontSize: 12, fontFamily: 'var(--fd)', fontWeight: 700 }}>{rate}×</button>
          <button className="p-btn" onClick={() => setMenu(m => m === 'quality' ? '' : 'quality')} aria-label="Quality" style={{ fontSize: 12, fontFamily: 'var(--fd)', fontWeight: 700 }}>{curLabel}</button>
          <button className="p-btn" onClick={togglePiP} aria-label="Picture in Picture">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-8v6h8v-6zm4 8V5H1v14h22zM3 7h18v10H3V7z"/></svg>
          </button>
          <button className="p-btn" onClick={toggleFS} aria-label="Fullscreen">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
          </button>
        </div>
      </div>
      {menu === 'quality' && (
        <div className="p-menu">
          <h4>Quality</h4>
          <button className={qi === -1 ? 'sel' : ''} onClick={() => pickQuality(-1)}>Auto <span className="kbps">adaptive</span></button>
          {sortedLevels.map(l => (
            <button key={l.index} className={qi === l.index ? 'sel' : ''} onClick={() => pickQuality(l.index)}>
              {l.height}p <span className="kbps">{Math.round(l.bitrate / 1000)} kbps</span>
            </button>
          ))}
          <div className="p-ds">
            <button onClick={toggleSaver}>{dataSaver ? '✓ Data Saver ON' : 'Data Saver OFF'}</button>
            {dataSaver && <div className="note">Capped at 480p · low starting bitrate</div>}
          </div>
        </div>
      )}
      {menu === 'speed' && (
        <div className="p-menu">
          <h4>Playback speed</h4>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
            <button key={s} className={rate === s ? 'sel' : ''} onClick={() => { const v = videoRef.current; if (v) v.playbackRate = s; setRate(s); setMenu(''); }}>
              {s}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
