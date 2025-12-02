import { useMemo, useState } from 'react'
import { useJob } from '../job-context'
import { useSettings } from '../settings-context'
import { calculateQuote, formatCurrency, stumpLineTotal } from '../utils/calc'
import type { Photo, Job, AppSettings, QuoteTotals, Stump } from '../types'

const MAX_SHARED_PHOTOS = 3
const TARGET_MAX_DIM = 800
const JPEG_QUALITY = 0.7

export const ShareBar = ({ disabled }: { disabled: boolean }) => {
  const { job } = useJob()
  const { settings } = useSettings()
  const totals = useMemo(() => calculateQuote(job, settings), [job, settings])
  const [statusMessage, setStatusMessage] = useState('')

  const shareAvailable = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const fileShareAvailable = shareAvailable && typeof navigator.canShare === 'function'
  const clipboardAvailable = typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText
  const hasAnySharePath = shareAvailable || clipboardAvailable

  const signatureLines = () => [
    settings.companyName,
    'Lucas Lepore',
    '226-555-0123',
    'forestcitystumpworks.com',
  ]

  const quoteLines = () => {
    const lines: string[] = []
    lines.push(`${settings.companyName}`)
    lines.push('Stump Grinding Quote')
    lines.push(`Date: ${new Date().toLocaleDateString()}`)
    lines.push(`Quote ID: ${job.id.slice(0, 8)}`)
    if (job.clientName) lines.push(`Client: ${job.clientName}`)
    if (job.address) lines.push(`Address: ${job.address}`)
    lines.push(`Stumps: ${job.stumps.length}`)
    lines.push('')
      job.stumps.forEach((s, idx) => {
        const photosCount = s.photos?.length || 0
        const adjustments = describeAdjustments(s)
        const lineTotal = stumpLineTotal(s, settings)
        lines.push(
          `Stump ${idx + 1}: ${s.diameter}\" x${s.count || 1}${s.locationDescription ? ` • ${s.locationDescription}` : ''}`,
        )
        if (adjustments) lines.push(`  Adjustments: ${adjustments}`)
        if (s.notes) lines.push(`  Notes: ${s.notes}`)
        lines.push(`  Photos: ${photosCount}`)
        lines.push(`  Line total: ${formatCurrency(lineTotal, settings.currency)}`)
      })
    lines.push('')
    lines.push(`Subtotal: ${formatCurrency(totals.subtotal, settings.currency)}`)
    if (settings.taxEnabled)
      lines.push(`HST (${(settings.taxRate * 100).toFixed(0)}%): ${formatCurrency(totals.taxAmount, settings.currency)}`)
    lines.push(`Total: ${formatCurrency(totals.total, settings.currency)}`)
    lines.push('')
    lines.push('Thank you for the opportunity to quote. Please reply to approve and schedule.')
    lines.push('')
    lines.push(...signatureLines())
    return lines
  }

  const shareText = () => quoteLines().join('\n')

  const handleShare = async () => {
    const text = shareText()
    setStatusMessage('')

    if (shareAvailable) {
      try {
        const files: File[] = []
        if (fileShareAvailable) {
          const photoFiles = await buildPhotoFiles(job.stumps)
          const pdfFile = await buildQuotePdfFile(job, settings, totals, signatureLines())
          if (pdfFile) files.push(pdfFile)
          files.push(...photoFiles)
        }

        if (files.length && navigator.canShare && navigator.canShare({ files })) {
          await navigator.share({ text, title: 'Stump quote', files })
          setStatusMessage('Shared with photos attached.')
          return
        }

        await navigator.share({ text, title: 'Stump quote' })
        setStatusMessage('Quote shared.')
        return
      } catch (e) {
        console.warn('share failed, trying clipboard', e)
      }
    }

    if (clipboardAvailable) {
      try {
        await navigator.clipboard.writeText(text)
        setStatusMessage('Copied quote to clipboard.')
        return
      } catch (err) {
        console.warn('clipboard write failed', err)
      }
    }

    setStatusMessage('Sharing is not available on this device.')
  }

  const handlePdf = async () => {
    if (typeof document === 'undefined') return
    const el = document.getElementById('quote-summary')
    if (!el) return

    const [html2canvas, { default: jsPDF }] = await Promise.all([
      import('html2canvas').then((m) => m.default),
      import('jspdf'),
    ])

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 16
    const usableWidth = pageWidth - margin * 2

    // 1) add summary snapshot
    const summaryCanvas = await html2canvas(el as HTMLElement, { scale: 2 })
    const summaryData = summaryCanvas.toDataURL('image/png')
    const summaryHeight = (summaryCanvas.height * usableWidth) / summaryCanvas.width
    pdf.addImage(summaryData, 'PNG', margin, margin, usableWidth, summaryHeight)

    let y = margin + summaryHeight + 12

    // 2) add photos
    for (let si = 0; si < job.stumps.length; si++) {
      const stump = job.stumps[si]
      if (!stump.photos || !stump.photos.length) continue

      for (let pi = 0; pi < stump.photos.length; pi++) {
        const photo = stump.photos[pi]
        const img = await dataUrlToImage(photo.dataUrl)
        if (!img) continue
        const dims = scaleDown(img.width, img.height, usableWidth)
        if (y + dims.height + 20 > pageHeight) {
          pdf.addPage()
          y = margin
        }
        pdf.text(`Stump ${si + 1} photo ${pi + 1}`, margin, y)
        y += 6
        pdf.addImage(img, 'JPEG', margin, y, dims.width, dims.height)
        y += dims.height + 12
      }
    }

    pdf.save('stump-quote.pdf')
  }

  return (
    <div className="flex flex-col gap-2 text-slate-200">
      <div className="flex items-center gap-2">
        <button
          className="rounded-lg border border-yellow-400 bg-yellow-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:border-yellow-300 hover:bg-yellow-400 disabled:opacity-50"
          onClick={handleShare}
          disabled={disabled || !hasAnySharePath}
          title={!hasAnySharePath ? 'Sharing is not available in this browser' : undefined}
        >
          {shareAvailable ? 'Share quote' : 'Copy quote'}
        </button>
        <button
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:border-yellow-400 disabled:opacity-50"
          onClick={handlePdf}
          disabled={disabled}
        >
          Export PDF
        </button>
        {!hasAnySharePath && (
          <p className="text-xs text-red-300">Sharing is unavailable in this browser.</p>
        )}
      </div>
      {statusMessage && <p className="text-xs text-slate-300" aria-live="polite">{statusMessage}</p>}
    </div>
  )
}

const describeAdjustments = (stump: Stump) => {
  const labels = [stump.isComplex && 'Complex', stump.isTightAccess && 'Tight access'].filter(Boolean)
  return labels.join(', ')
}

const buildQuotePdfFile = async (job: Job, settings: AppSettings, totals: QuoteTotals, sig: string[]): Promise<File | null> => {
  const { default: jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' })
  const margin = 24
  const lineHeight = 16
  let y = margin

  pdf.setFontSize(16)
  pdf.text(settings.companyName, margin, y)
  y += lineHeight
  pdf.setFontSize(12)
  pdf.text('Stump Grinding Quote', margin, y)
  y += lineHeight
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin, y)
  y += lineHeight
  pdf.text(`Quote ID: ${job.id.slice(0, 8)}`, margin, y)
  y += lineHeight
  if (job.clientName) {
    pdf.text(`Client: ${job.clientName}`, margin, y)
    y += lineHeight
  }
  if (job.address) {
    pdf.text(`Address: ${job.address}`, margin, y)
    y += lineHeight
  }
  y += lineHeight

  // table header
  pdf.setFont('helvetica', 'bold')
  pdf.text('Stump', margin, y)
    pdf.text('Diameter', margin + 80, y)
    pdf.text('Count', margin + 150, y)
    pdf.text('Adjust', margin + 220, y)
    pdf.text('Photos', margin + 280, y)
    pdf.text('Line', margin + 340, y)
    pdf.setFont('helvetica', 'normal')
    y += lineHeight
    pdf.line(margin, y - 10, margin + 380, y - 10)

    job.stumps.forEach((s, idx) => {
      pdf.text(`Stump ${idx + 1}`, margin, y)
      pdf.text(`${s.diameter}\"`, margin + 80, y)
      pdf.text(`${s.count || 1}`, margin + 150, y)
      pdf.text(describeAdjustments(s) || '-', margin + 220, y, { maxWidth: 60 })
      pdf.text(`${s.photos?.length || 0}`, margin + 280, y)
      pdf.text(formatCurrency(stumpLineTotal(s, settings), settings.currency), margin + 340, y, { maxWidth: 120 })
      y += lineHeight
    })

  y += lineHeight
  pdf.text(`Subtotal: ${formatCurrency(totals.subtotal, settings.currency)}`, margin, y)
  y += lineHeight
  if (settings.taxEnabled) {
    pdf.text(`HST (${(settings.taxRate * 100).toFixed(0)}%): ${formatCurrency(totals.taxAmount, settings.currency)}`, margin, y)
    y += lineHeight
  }
  pdf.text(`Total: ${formatCurrency(totals.total, settings.currency)}`, margin, y)
  y += lineHeight * 2

  pdf.text('Thank you for the opportunity to quote. Please reply to approve and schedule.', margin, y, { maxWidth: 360 })
  y += lineHeight
  sig.forEach((line) => {
    pdf.text(line, margin, y)
    y += lineHeight
  })

  const blob = pdf.output('blob')
  return new File([blob], 'stump-quote.pdf', { type: 'application/pdf' })
}

const buildPhotoFiles = async (stumps: { photos?: Photo[] }[]) => {
  const files: File[] = []
  for (const stump of stumps) {
    if (!stump.photos || !stump.photos.length) continue
    for (const p of stump.photos.slice(0, MAX_SHARED_PHOTOS - files.length)) {
      const file = await dataUrlToResizedFile(p.dataUrl, TARGET_MAX_DIM, JPEG_QUALITY)
      if (file) files.push(file)
      if (files.length >= MAX_SHARED_PHOTOS) break
    }
    if (files.length >= MAX_SHARED_PHOTOS) break
  }
  return files
}

const dataUrlToResizedFile = async (dataUrl: string, maxDim: number, quality: number): Promise<File | null> => {
  try {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const { width, height } = scaleDown(img.width, img.height, maxDim)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, width, height)
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return null
    return new File([blob], 'stump-photo.jpg', { type: 'image/jpeg' })
  } catch (e) {
    console.warn('resize photo failed', e)
    return null
  }
}

const scaleDown = (w: number, h: number, maxDim: number) => {
  if (w <= maxDim && h <= maxDim) return { width: w, height: h }
  const ratio = w / h
  if (w >= h) return { width: maxDim, height: Math.round(maxDim / ratio) }
  return { width: Math.round(maxDim * ratio), height: maxDim }
}

const dataUrlToImage = async (dataUrl: string): Promise<HTMLImageElement | null> => {
  try {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    return img
  } catch (e) {
    console.warn('decode image failed', e)
    return null
  }
}
