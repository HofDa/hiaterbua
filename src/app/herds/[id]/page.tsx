import { redirect } from 'next/navigation'

export default async function HerdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  redirect(`/herd?id=${encodeURIComponent(id)}`)
}
