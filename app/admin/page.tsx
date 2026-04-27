"use client"
import dynamic from 'next/dynamic'

const AdminPage = dynamic(() => import('./AdminPage'), { ssr: false })

export default function Page() {
  return <AdminPage />
}
