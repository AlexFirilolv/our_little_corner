import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { getAllMedia } from '@/lib/db'
import AdminDashboard from './components/AdminDashboard'

export default async function AdminPage() {
  const authenticated = await isAuthenticated()
  
  if (!authenticated) {
    redirect('/login')
  }

  // Fetch media items for the admin view
  const mediaItems = await getAllMedia()

  return <AdminDashboard mediaItems={mediaItems} />
}