import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client using SERVICE ROLE KEY — bypasses RLS completely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    const path     = formData.get('path') as string | null
    const bucket   = (formData.get('bucket') as string | null) ?? 'campus-files'

    if (!file || !path) {
      return NextResponse.json({ error: 'Missing file or path' }, { status: 400 })
    }

    // Sanitize filename – spaces & special chars break Supabase Storage
    const safeName    = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = path.replace(/[^a-zA-Z0-9/._-]/g, '_') + safeName

    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    const { error: upErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert:      true,
        cacheControl: '3600',
      })

    if (upErr) {
      console.error('[upload-api] Storage error:', upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(storagePath)

    return NextResponse.json({ publicUrl: urlData.publicUrl, path: storagePath })
  } catch (err: any) {
    console.error('[upload-api] Unexpected error:', err)
    return NextResponse.json({ error: err?.message ?? 'Upload failed' }, { status: 500 })
  }
}
