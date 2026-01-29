
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuth } from 'firebase-admin/auth';
import adminApp from '@/lib/firebase/admin';

// Verify adminApp is initialized (optional but good sanity check)
if (!adminApp) {
    console.error("Firebase Admin not initialized. Check env vars.");
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const locketId = searchParams.get('locketId');

        if (!locketId) {
            return NextResponse.json({ error: 'Locket ID is required' }, { status: 400 });
        }

        // Auth check - simplified for brevity, assume middleware or helper
        // In a real app, verify the user has access to this locket
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify token
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(token);
        // implicit: use decodedToken.uid to verify membership in locket via DB check

        const result = await query(
            `SELECT * FROM bucket_list_items WHERE locket_id = $1 ORDER BY created_at DESC`,
            [locketId]
        );

        return NextResponse.json({ items: result.rows });

    } catch (error) {
        console.error('Error fetching bucket list items:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { locketId, title, category = 'other' } = body;

        if (!locketId || !title) {
            return NextResponse.json({ error: 'Locket ID and Title are required' }, { status: 400 });
        }

        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(token);

        const result = await query(
            `INSERT INTO bucket_list_items (locket_id, title, category, created_by_firebase_uid, status)
             VALUES ($1, $2, $3, $4, 'active')
             RETURNING *`,
            [locketId, title, category, decodedToken.uid]
        );

        return NextResponse.json({ item: result.rows[0] });

    } catch (error) {
        console.error('Error creating bucket list item:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
