import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuth } from 'firebase-admin/auth';
import adminApp from '@/lib/firebase/admin';

if (!adminApp) {
  console.error("Firebase Admin not initialized. Check env vars.");
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken.uid;
  } catch {
    return null;
  }
}

async function verifyItemAccess(itemId: string, firebaseUid: string): Promise<boolean> {
  // Verify user has access to the locket that owns this bucket list item
  const result = await query(
    `SELECT bli.id FROM bucket_list_items bli
     JOIN locket_users cu ON bli.locket_id = cu.locket_id
     WHERE bli.id = $1 AND cu.firebase_uid = $2`,
    [itemId, firebaseUid]
  );
  return result.rows.length > 0;
}

// GET single bucket list item
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    console.log(`[API] Fetching bucket list item ${id}`);

    const firebaseUid = await verifyAuth(request);
    console.log(`[API] Auth check result: ${firebaseUid ? 'Success' : 'Failed'}`);

    if (!firebaseUid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[API] Verifying access for item ${id} and user ${firebaseUid}`);
    const hasAccess = await verifyItemAccess(id, firebaseUid);
    console.log(`[API] Access check result: ${hasAccess}`);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
    }

    const result = await query(
      `SELECT * FROM bucket_list_items WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Error fetching bucket list item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT - update bucket list item (status, title, category)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const firebaseUid = await verifyAuth(request);

    if (!firebaseUid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await verifyItemAccess(id, firebaseUid);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
    }

    const body = await request.json();
    const { status, title, category, description } = body;

    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: (string | Date | null)[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
      // If marking as completed, set completed_at timestamp
      if (status === 'completed') {
        updates.push(`completed_at = $${paramIndex++}`);
        values.push(new Date().toISOString());
      } else if (status === 'active') {
        updates.push(`completed_at = $${paramIndex++}`);
        values.push(null);
      }
    }

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }

    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE bucket_list_items
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Error updating bucket list item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE - remove bucket list item
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const firebaseUid = await verifyAuth(request);

    if (!firebaseUid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[API] Verifying access for item ${id} by user ${firebaseUid}`);
    const hasAccess = await verifyItemAccess(id, firebaseUid);
    console.log(`[API] Access result: ${hasAccess}`);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
    }

    const result = await query(
      `DELETE FROM bucket_list_items WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting bucket list item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
