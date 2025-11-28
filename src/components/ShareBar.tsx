import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { useJob } from '../job-context'
import { useSettings } from '../settings-context'
import { calculateQuote, formatCurrency } from '../utils/calc'
import type { Photo } from '../types'

const MAX_SHARED_PHOTOS = 3
const TARGET_MAX_DIM = 800
const JPEG_QUALITY = 0.7

export const ShareBar = ({ disabled }: { disabled: boolean }) => {
  const { job } = useJob()
  const { settings } = useSettings()
  const totals = calculateQuote(job, settings)

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
      lines.push(`Stump ${idx + 1}: ${s.diameter}"${s.locationDescription ? ` • ${s.locationDescription}` : ''}`)
      lines.push(`  Photos: ${photosCount}`)
    })
    lines.push('')
    lines.push(`Subtotal: ${formatCurrency(totals.subtotal, settings.currency)}`)
    if (settings.taxEnabled)
      lines.push(`HST (${(settings.taxRate * 100).toFixed(0)}%): ${formatCurrency(totals.taxAmount, settings.currency)}`)
    lines.push(`Total: ${formatCurrency(totals.total, settings.currency)}`)
    lines.push('')
    lines.push('Thank you for the opportunity to quote. Please reply to approve and schedule.')
    return lines
  }

  const shareText = () => quoteLines().join('\n')

  const handleShare = async () => {
    const text = shareText()
    const files = await buildPhotoFiles(job.stumps)

    if (files.length && navigator.canShare && navigator.canShare({ files })) {
      try {
        await navigator.share({ text, title: 'Stump quote', files })
        return
      } catch (e) {
        console.warn('share with files failed, fallback to text', e)
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ text, title: 'Stump quote' })
        return
      } catch (e) {
        // fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.warn('share/clipboard failed', err)
    }
  }

  const handleEmail = async () => {
    const subject = `${settings.companyName} — Stump Quote`
    const body = shareText()
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
  }

  const handlePdf = async () => {
    const el = document.getElementById('quote-summary')
    if (!el) return

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
    <div className="flex gap-2">
      <button
        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:border-yellow-400 disabled:opacity-50"
        onClick={handleShare}
        disabled={disabled}
      >
        Share / Copy
      </button>
      <button
        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:border-yellow-400 disabled:opacity-50"
        onClick={handleEmail}
        disabled={disabled}
      >
        Email quote
      </button>
      <button
        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:border-yellow-400 disabled:opacity-50"
        onClick={handlePdf}
        disabled={disabled}
      >
        Export PDF
      </button>
    </div>
  )
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
