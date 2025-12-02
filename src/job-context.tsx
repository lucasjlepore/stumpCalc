import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Job, Stump } from './types'

const STORAGE_KEY = 'stumpcalc_job_v1'

const newJob = (): Job => ({
  id: uuidv4(),
  clientName: '',
  address: '',
  status: 'DRAFT',
  createdAt: new Date().toISOString(),
  stumps: [
    {
      id: uuidv4(),
      diameter: 0,
      count: 1,
      locationDescription: 'Front yard',
      notes: '',
      isComplex: false,
      isTightAccess: false,
      photos: [],
    },
  ],
})

type JobContextValue = {
  job: Job
  resetJob: () => void
  updateJob: (partial: Partial<Job>) => void
  updateStump: (id: string, partial: Partial<Stump>) => void
  addStump: () => void
  removeStump: (id: string) => void
}

const JobContext = createContext<JobContextValue | undefined>(undefined)

export const JobProvider = ({ children }: { children: ReactNode }) => {
  const [job, setJob] = useState<Job>(() => {
    const canUseStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    if (canUseStorage) {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const stumps = Array.isArray(parsed?.stumps)
            ? parsed.stumps.map((s: any, idx: number) => ({
                id: s.id || uuidv4(),
                diameter: Number.isFinite(s.diameter) ? s.diameter : 0,
                count: Number.isFinite(s.count) && s.count > 0 ? s.count : 1,
                locationDescription: s.locationDescription ?? `Stump ${idx + 1}`,
                notes: s.notes ?? '',
                isComplex: Boolean(s.isComplex),
                isTightAccess: Boolean(s.isTightAccess),
                photos: s.photos ?? [],
              }))
            : newJob().stumps
          return { ...newJob(), ...parsed, stumps }
        } catch (err) {
          console.warn('Failed to parse saved job', err)
        }
      }
    }
    return newJob()
  })

  useEffect(() => {
    const canUseStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    if (!canUseStorage) return

    try {
      const jobToPersist = {
        ...job,
        stumps: job.stumps.map(({ photos, ...rest }) => rest), // avoid huge photos in localStorage
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jobToPersist))
    } catch (err) {
      console.warn('Persist job failed (likely quota exceeded)', err)
    }
  }, [job])

  const value = useMemo(() => ({
    job,
    resetJob: () => setJob(newJob()),
    updateJob: (partial: Partial<Job>) => setJob((prev) => ({ ...prev, ...partial })),
    updateStump: (id: string, partial: Partial<Stump>) =>
      setJob((prev) => ({
        ...prev,
        stumps: prev.stumps.map((s) => (s.id === id ? { ...s, ...partial } : s)),
      })),
    addStump: () =>
      setJob((prev) => ({
        ...prev,
        stumps: [
          ...prev.stumps,
          {
            id: uuidv4(),
            diameter: 0,
            count: 1,
            locationDescription: `Stump ${prev.stumps.length + 1}`,
            notes: '',
            isComplex: false,
            isTightAccess: false,
            photos: [],
          },
        ],
      })),
    removeStump: (id: string) =>
      setJob((prev) => ({ ...prev, stumps: prev.stumps.filter((s) => s.id !== id) })),
  }), [job])

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>
}

export const useJob = () => {
  const ctx = useContext(JobContext)
  if (!ctx) throw new Error('useJob must be used within JobProvider')
  return ctx
}
