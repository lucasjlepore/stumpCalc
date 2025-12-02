export type AppSettings = {
  baseRatePerInch: number
  taxRate: number
  taxEnabled: boolean
  measureUnit: 'inches'
  currency: 'CAD'
  companyName: string
}

export type Photo = {
  id: string
  dataUrl: string
  name: string
  createdAt: string
}

export type Stump = {
  id: string
  diameter: number
  count: number
  locationDescription?: string
  notes?: string
  isComplex: boolean
  isTightAccess: boolean
  photos: Photo[]
}

export type Job = {
  id: string
  clientName: string
  address: string
  status: 'DRAFT' | 'SENT' | 'COMPLETED' | 'ARCHIVED'
  createdAt: string
  stumps: Stump[]
}

export type QuoteTotals = {
  subtotal: number
  taxAmount: number
  total: number
}
