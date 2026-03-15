import { redirect } from 'next/navigation'

export default async function EditHerdPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  redirect(`/herd/edit?id=${encodeURIComponent(id)}`)
}
