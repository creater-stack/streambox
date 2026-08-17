'use client';
import { useEffect, useState } from 'react';
type T = { id: number; msg: string; err?: boolean };
declare global { interface Window { __toast: (msg: string, err?: boolean) => void } }
export default function Toasts() {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    window.__toast = (msg, err) => {
      const id = Date.now() + Math.random();
      setItems(x => [...x, { id, msg, err }]);
      setTimeout(() => setItems(x => x.filter(t => t.id !== id)), 3800);
    };
  }, []);
  return (
    <div className="toasts">
      {items.map(t => <div key={t.id} className={`toast${t.err ? ' err' : ''}`}>{t.msg}</div>)}
    </div>
  );
}
