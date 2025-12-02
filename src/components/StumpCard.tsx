import type { ChangeEvent } from 'react'
import { useJob } from '../job-context'
import { useSettings } from '../settings-context'
import type { Photo, Stump } from '../types'
import { PhotoGrid } from './PhotoGrid'

const numberFromInput = (e: ChangeEvent<HTMLInputElement>) => Number(e.target.value) || 0

export const StumpCard = ({ stump }: { stump: Stump }) => {
  const { updateStump, removeStump, job } = useJob()
  const { settings } = useSettings()

  const handleChange = (partial: Partial<Stump>) => updateStump(stump.id, partial)
  const isOnlyStump = job.stumps.length === 1
  const isDiameterInvalid = !stump.diameter || stump.diameter <= 0
  const isCountInvalid = !stump.count || stump.count <= 0
  const adjustments = [stump.isComplex && 'Complex stump', stump.isTightAccess && 'Tight access']
    .filter(Boolean)
    .join(', ')

  const handleAddPhotos = (newPhotos: Photo[]) => {
    handleChange({ photos: [...(stump.photos || []), ...newPhotos] })
  }

  const handleRemovePhoto = (id: string) => {
    handleChange({ photos: (stump.photos || []).filter((p) => p.id !== id) })
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-slate-400">Stump</p>
          <p className="font-semibold text-slate-50">{stump.locationDescription || 'Location pending'}</p>
        </div>
        <button
          className="text-xs text-red-400 underline disabled:opacity-40"
          onClick={() => removeStump(stump.id)}
          disabled={isOnlyStump}
        >
          Remove
        </button>
      </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col text-sm text-slate-300">
            Diameter ({settings.measureUnit})
            <input
              type="number"
              min={0}
              className={`mt-1 rounded-lg border bg-slate-800 px-3 py-2 text-slate-50 focus:border-yellow-400 focus:outline-none ${
                isDiameterInvalid ? 'border-red-500' : 'border-slate-700'
              }`}
              value={stump.diameter || ''}
              onChange={(e) => handleChange({ diameter: numberFromInput(e) })}
              placeholder="Enter diameter"
              aria-invalid={isDiameterInvalid}
            />
            {isDiameterInvalid && <span className="text-xs text-red-400">Required for a valid quote.</span>}
          </label>

          <label className="flex flex-col text-sm text-slate-300">
            Count
            <input
              type="number"
              min={1}
              className={`mt-1 rounded-lg border bg-slate-800 px-3 py-2 text-slate-50 focus:border-yellow-400 focus:outline-none ${
                isCountInvalid ? 'border-red-500' : 'border-slate-700'
              }`}
              value={stump.count || ''}
              onChange={(e) => handleChange({ count: Math.max(0, numberFromInput(e)) })}
              placeholder="1"
              aria-invalid={isCountInvalid}
            />
            {isCountInvalid && <span className="text-xs text-red-400">At least 1 stump required.</span>}
          </label>

          <div className="flex flex-col justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-200">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-yellow-400"
                checked={stump.isComplex}
                onChange={(e) => handleChange({ isComplex: e.target.checked })}
              />
              Complex stump
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-yellow-400"
                checked={stump.isTightAccess}
                onChange={(e) => handleChange({ isTightAccess: e.target.checked })}
              />
              Tight access
            </label>
            <p className="text-[11px] text-slate-400">Surcharges apply and appear in the quote.</p>
          </div>
        </div>

        <label className="mt-3 block text-sm text-slate-300">
          Location note
        <input
          type="text"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-yellow-400 focus:outline-none"
          value={stump.locationDescription || ''}
          onChange={(e) => handleChange({ locationDescription: e.target.value })}
          placeholder="e.g., Front yard near driveway"
        />
        </label>

        <label className="mt-3 block text-sm text-slate-300">
          Notes (optional)
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-yellow-400 focus:outline-none"
            value={stump.notes || ''}
            onChange={(e) => handleChange({ notes: e.target.value })}
            placeholder="Cleanup details, obstacles, etc."
            rows={2}
          />
          {adjustments && <span className="text-xs text-slate-400">Adjustments: {adjustments}</span>}
        </label>

        <div className="mt-3 text-sm text-slate-300">
          <p className="mb-1 text-slate-200">Photos (optional, max 3)</p>
        <PhotoGrid photos={stump.photos || []} onAdd={handleAddPhotos} onRemove={handleRemovePhoto} />
      </div>
    </div>
  )
}
