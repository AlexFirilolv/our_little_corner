import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { getAllMedia } from '@/lib/db'
import MediaGallery from './(gallery)/components/MediaGallery'

export default async function HomePage() {
  const authenticated = await isAuthenticated()
  
  if (!authenticated) {
    redirect('/login')
  }

  // Fetch media items for the gallery
  const mediaItems = await getAllMedia()

  return <MediaGallery mediaItems={mediaItems} />
}