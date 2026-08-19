import ServiceWorkerRegister from './_components/ServiceWorkerRegister'

export default function StormPrepLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceWorkerRegister />
      {children}
    </>
  )
}
