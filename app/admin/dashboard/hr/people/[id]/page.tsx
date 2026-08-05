import PersonProfile from '../../../_components/sections/PersonProfile'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PersonProfile id={id} />
}
