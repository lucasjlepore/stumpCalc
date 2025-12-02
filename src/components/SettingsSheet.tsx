import { useSettings } from '../settings-context'
import type { AppSettings } from '../types'

export const SettingsSheet = () => {
  const { settings, updateSettings } = useSettings()

  const handleNumber = (
    key: keyof Pick<AppSettings, 'baseRatePerInch' | 'taxRate'>,
    transform?: (num: number) => number,
  ) =>
    (value: string) => {
      const num = Number(value)
      if (!Number.isFinite(num)) return
      const next = transform ? transform(num) : num
      updateSettings({ [key]: next } as Partial<AppSettings>)
    }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-slate-400">Defaults</p>
          <h2 className="text-lg font-semibold text-slate-50">Pricing presets</h2>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">Autosaves locally</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <TextField
          label="Company name"
          value={settings.companyName}
          onChange={(v) => updateSettings({ companyName: v })}
          placeholder="Shown on quotes"
        />
        <NumberField
          label="Base rate ($/inch)"
          value={settings.baseRatePerInch}
          onChange={handleNumber('baseRatePerInch')}
          step="0.5"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <NumberField
          label="HST rate (%)"
          value={settings.taxRate * 100}
          onChange={handleNumber('taxRate', (v) => v / 100)}
          step="0.5"
        />
        <label className="flex items-center gap-2 text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 accent-yellow-400"
            checked={settings.taxEnabled}
            onChange={(e) => updateSettings({ taxEnabled: e.target.checked })}
          />
          Charge HST on totals
        </label>
      </div>
    </div>
  )
}

const NumberField = ({
  label,
  value,
  onChange,
  step,
}: {
  label: string
  value: number
  step?: string
  onChange: (v: string) => void
}) => (
  <label className="flex flex-col text-slate-200">
    <span className="text-xs text-slate-400">{label}</span>
    <input
      type="number"
      step={step || '1'}
      className="mt-1 rounded-lg border border-slate-800 bg-slate-800 px-3 py-2 text-slate-50 focus:border-yellow-400 focus:outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
)

const TextField = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
}) => (
  <label className="flex flex-col text-slate-200">
    <span className="text-xs text-slate-400">{label}</span>
    <input
      type="text"
      className="mt-1 rounded-lg border border-slate-800 bg-slate-800 px-3 py-2 text-slate-50 focus:border-yellow-400 focus:outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </label>
)
