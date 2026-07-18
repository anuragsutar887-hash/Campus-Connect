import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Validate the service role key — reject placeholder / missing values
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const isValidKey = serviceRoleKey &&
  serviceRoleKey !== 'YOUR_SERVICE_ROLE_KEY_HERE' &&
  serviceRoleKey.length > 20

// Use service role key if valid, otherwise fall back to anon key (limited by RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  isValidKey ? serviceRoleKey! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { table, method, data, filters } = await req.json()

    if (!table || !method) {
      return NextResponse.json({ error: 'Missing table or method' }, { status: 400 })
    }

    let query = supabaseAdmin.from(table)
    let result: any = null

    if (method === 'insert') {
      result = await query.insert(data).select()
    } else if (method === 'upsert') {
      result = await query.upsert(data).select()
    } else if (method === 'update') {
      let updateQuery: any = query.update(data)
      if (filters && Array.isArray(filters)) {
        for (const f of filters) {
          updateQuery = updateQuery.eq(f.col, f.val)
        }
      }
      result = await updateQuery.select()
    } else if (method === 'delete') {
      let deleteQuery: any = query.delete()
      if (filters && Array.isArray(filters)) {
        for (const f of filters) {
          deleteQuery = deleteQuery.eq(f.col, f.val)
        }
      }
      result = await deleteQuery.select()
    } else {
      return NextResponse.json({ error: `Invalid method: ${method}` }, { status: 400 })
    }

    if (result.error) {
      console.error(`[db-api] Error in ${method} on ${table}:`, result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ data: result.data })
  } catch (err: any) {
    console.error('[db-api] Unexpected error:', err)
    return NextResponse.json({ error: err?.message ?? 'Operation failed' }, { status: 500 })
  }
}
