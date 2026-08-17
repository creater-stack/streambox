import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import EditVideoForm from '@/components/EditVideoForm';

export const dynamic = 'force-dynamic';

export default async function EditPage({ params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) redirect('/login');
  const video = await prisma.video.findUnique({ where: { id: params.id }, include: { tags: { include: { tag: true } } } });
  if (!video) notFound();
  if (video.userId !== user.id) redirect('/dashboard');
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  return (
    <>
      <h1 className="page-title">Edit video</h1>
      <p className="page-sub">Changes apply immediately.</p>
      <div style={{ maxWidth: 680, marginTop: 24 }}>
        <EditVideoForm
          video={{ id: video.id, title: video.title, description: video.description || '', categoryId: video.categoryId || '', tags: video.tags.map(t => t.tag.name), thumbUrl: video.thumbPath ? `/api/media/${video.thumbPath}` : null }}
          categories={categories}
        />
      </div>
    </>
  );
}
