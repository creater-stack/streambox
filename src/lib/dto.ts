export function videoDTO(v: any) {
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    status: v.status,
    failReason: v.failReason ?? null,
    duration: v.duration,
    thumbUrl: v.thumbPath ? `/api/media/${v.thumbPath}` : null,
    hlsUrl: v.status === 'READY' && v.hlsPath ? `/api/hls/${v.hlsPath}/master.m3u8` : null,
    viewsCount: v.viewsCount,
    likesCount: v.likesCount,
    commentsCount: v.commentsCount,
    createdAt: v.createdAt,
    publishedAt: v.publishedAt,
    username: v.user?.username,
    avatarUrl: v.user?.avatarUrl ? `/api/media/${v.user.avatarUrl}` : null,
    category: v.category?.name ?? null,
    tags: v.tags?.map((t: any) => t.tag?.name ?? t.name) ?? []
  };
}
export const num = (b: bigint | number | null | undefined) => Number(b ?? 0);
