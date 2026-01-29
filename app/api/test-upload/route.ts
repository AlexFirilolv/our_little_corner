import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/firebase/serverAuth'
import { getUserLockets, createMemoryGroup, createMediaItem, getAllMemoryGroups } from '@/lib/db'
import type { CreateMemoryGroup, CreateMediaItem } from '@/lib/types'

/**
 * POST /api/test-upload - Test the complete upload flow
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Step 1: Get user's lockets
    const lockets = await getUserLockets(user.uid)
    console.log('User lockets:', lockets.map(l => ({ id: l.id, name: l.name })))

    if (lockets.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No lockets found for user',
        debug: { userId: user.uid }
      })
    }

    const currentLocket = lockets[0] // Use first locket for test

    // Step 2: Create a test memory group
    const memoryGroupData: CreateMemoryGroup = {
      locket_id: currentLocket.id,
      title: `Test Upload ${new Date().toISOString()}`,
      description: 'Test memory group created via API',
      is_locked: false,
      created_by_firebase_uid: user.uid
    }

    console.log('Creating memory group with data:', memoryGroupData)
    const memoryGroup = await createMemoryGroup(memoryGroupData)
    console.log('Created memory group:', memoryGroup)

    // Step 3: Create a test media item
    const mediaData: CreateMediaItem = {
      locket_id: currentLocket.id,
      memory_group_id: memoryGroup.id,
      filename: 'test-image.jpg',
      original_name: 'test-image.jpg',
      storage_key: 'test/test-image.jpg',
      storage_url: 'https://example.com/test-image.jpg',
      file_type: 'image/jpeg',
      file_size: 1024,
      title: 'Test Image',
      note: 'Test media item',
      uploaded_by_firebase_uid: user.uid
    }

    console.log('Creating media item with data:', mediaData)
    const mediaItem = await createMediaItem(mediaData)
    console.log('Created media item:', mediaItem)

    // Step 4: Fetch memory groups to verify
    const memoryGroups = await getAllMemoryGroups(currentLocket.id, true, false)
    console.log('Fetched memory groups:', memoryGroups.map(g => ({
      id: g.id,
      title: g.title,
      media_count: g.media_count,
      media_items: g.media_items?.length || 0
    })))

    return NextResponse.json({
      success: true,
      debug: {
        user: { uid: user.uid, email: user.email },
        locket: { id: currentLocket.id, name: currentLocket.name },
        memoryGroup: { id: memoryGroup.id, title: memoryGroup.title },
        mediaItem: { id: mediaItem.id, filename: mediaItem.filename },
        fetchedGroups: memoryGroups.length,
        fetchedGroupsWithMedia: memoryGroups.filter(g => g.media_count && g.media_count > 0).length
      }
    })

  } catch (error) {
    console.error('Test upload error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
