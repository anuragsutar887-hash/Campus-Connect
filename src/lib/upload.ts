/**
 * uploadFile — uploads a file via the server-side /api/upload route.
 * This bypasses Supabase Row Level Security which blocks direct client uploads
 * when using Firebase Auth (Supabase sees the user as anonymous).
 *
 * @param file   The File object to upload
 * @param path   Storage path prefix, e.g. "submissions/classId/assignmentId/"
 * @param bucket Supabase bucket name (default: "campus-files")
 * @returns      The public URL of the uploaded file
 */
export async function uploadFile(
  file: File,
  path: string,
  bucket: string = 'campus-files'
): Promise<string> {
  const fd = new FormData()
  fd.append('file',   file)
  fd.append('path',   path)
  fd.append('bucket', bucket)

  const res = await fetch('/api/upload', { method: 'POST', body: fd })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? `Upload failed (HTTP ${res.status})`)
  }

  const { publicUrl } = await res.json()
  return publicUrl as string
}
