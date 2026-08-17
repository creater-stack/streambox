import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AdminClient from '@/components/AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');
  return (
    <>
      <h1 className="page-title">Admin panel</h1>
      <p className="page-sub">Platform moderation &amp; statistics.</p>
      <div style={{ marginTop: 22 }}><AdminClient /></div>
    </>
  );
}
