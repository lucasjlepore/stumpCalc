import type { AppSettings, Job, QuoteTotals, Stump } from '../types'

export const stumpLineTotal = (stump: Stump, settings: AppSettings) => {
  const count = stump.count && stump.count > 0 ? stump.count : 1
  const base = stump.diameter * settings.baseRatePerInch * count
  const complexityBump = stump.isComplex ? 0.2 : 0
  const accessBump = stump.isTightAccess ? 0.1 : 0
  const multiplier = 1 + complexityBump + accessBump
  const total = base * multiplier
  return Number.isFinite(total) ? total : 0
}

export const calculateQuote = (job: Job, settings: AppSettings): QuoteTotals => {
  let subtotal = 0

  job.stumps.forEach((stump) => {
    subtotal += stumpLineTotal(stump, settings)
  })

  const taxAmount = settings.taxEnabled ? subtotal * settings.taxRate : 0
  const total = subtotal + taxAmount

  return { subtotal, taxAmount, total }
}

export const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(value)
