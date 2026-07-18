'use client'

import { useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function FileUpload() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [fileUrl, setFileUrl] = useState('')

  const uploadFile = async () => {
    if (!file) {
      alert('Please select a file first')
      return
    }

    try {
      setUploading(true)

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${file.name}`
      const filePath = `notes/${fileName}`

      const { error } = await supabase.storage
        .from('campus-files')
        .upload(filePath, file)

      if (error) {
        throw error
      }

      const { data } = supabase.storage
        .from('campus-files')
        .getPublicUrl(filePath)

      setFileUrl(data.publicUrl)
      alert('File uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          Upload Notes / Assignment
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload PDF, DOCX, PPT, or image files.
        </p>
      </div>

      <input
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="block w-full text-sm"
      />

      <button
        onClick={uploadFile}
        disabled={uploading}
        className="rounded-lg bg-brand-500 px-4 py-2 text-white disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload File'}
      </button>

      {fileUrl && (
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium">Uploaded file:</p>
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline"
          >
            Open File
          </a>
        </div>
      )}
    </div>
  )
}