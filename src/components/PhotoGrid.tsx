import type { ChangeEvent } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Photo } from '../types'

export type PhotoGridProps = {
  photos: Photo[]
  onAdd: (photos: Photo[]) => void
  onRemove: (id: string) => void
  max?: number
}

export const PhotoGrid = ({ photos, onAdd, onRemove, max = 3 }: PhotoGridProps) => {
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files.length) return
    const remaining = max - photos.length
    const take = Array.from(files).slice(0, remaining)

    const newPhotos: Photo[] = []
    for (const file of take) {
      const dataUrl = await fileToDataUrl(file)
      newPhotos.push({ id: uuidv4(), dataUrl, name: file.name, createdAt: new Date().toISOString() })
    }
    onAdd(newPhotos)
    e.target.value = ''
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-800 bg-slate-800">
            <img src={p.dataUrl} alt={p.name} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(p.id)}
              className="absolute right-1 top-1 rounded-full bg-slate-900/80 px-2 text-xs text-red-300"
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < max && (
          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-700 text-slate-300 hover:border-yellow-400">
            <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleFile} />
            <span className="text-sm">+ Photo</span>
          </label>
        )}
      </div>
    </div>
  )
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
