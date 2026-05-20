'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'

export type PromoType = 'percent' | 'fixed' | 'free_ship'

export interface PromotionFormValue {
  id?:           string
  code:          string
  description:   string
  type:          PromoType
  value:         string
  minOrder:      string
  maxDiscount:   string
  startsAt:      string  // datetime-local
  endsAt:        string
  usageLimit:    string
  perUserLimit:  string
  isActive:      boolean
}

export const emptyForm: PromotionFormValue = {
  code:         '',
  description:  '',
  type:         'percent',
  value:        '10',
  minOrder:     '0',
  maxDiscount:  '',
  startsAt:     '',
  endsAt:       '',
  usageLimit:   '',
  perUserLimit: '',
  isActive:     true,
}

interface Props {
  open:        boolean
  initial?:    PromotionFormValue
  editing:     boolean
  submitting:  boolean
  errorText:   string | null
  onSubmit:    (v: PromotionFormValue) => void
  onClose:     () => void
}

export default function PromotionFormModal({
  open, initial, editing, submitting, errorText, onSubmit, onClose,
}: Props) {
  const { t } = useI18n()
  const [form, setForm] = useState<PromotionFormValue>(initial ?? emptyForm)

  useEffect(() => {
    if (open) setForm(initial ?? emptyForm)
  }, [open, initial])

  if (!open) return null

  const set = <K extends keyof PromotionFormValue>(k: K, v: PromotionFormValue[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const canSubmit =
    form.code.trim().length >= 2 &&
    (form.type === 'free_ship' || Number(form.value) > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">
            {editing ? t('admin.promo.edit_title') : t('admin.promo.create_title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <Field label={t('admin.promo.field.code')} required>
            <input
              type="text"
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase().replace(/\s+/g, ''))}
              placeholder="WELCOME10"
              maxLength={50}
              disabled={editing}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono uppercase outline-none focus:border-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </Field>

          <Field label={t('admin.promo.field.description')}>
            <input
              type="text"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              maxLength={255}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('admin.promo.field.type')} required>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value as PromoType)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500 bg-white"
              >
                <option value="percent">{t('admin.promo.type.percent')}</option>
                <option value="fixed">{t('admin.promo.type.fixed')}</option>
                <option value="free_ship">{t('admin.promo.type.free_ship')}</option>
              </select>
            </Field>

            <Field
              label={
                form.type === 'percent' ? t('admin.promo.field.value_percent') :
                form.type === 'fixed'   ? t('admin.promo.field.value_fixed')   :
                                          t('admin.promo.field.value_none')
              }
              required={form.type !== 'free_ship'}
            >
              <input
                type="number"
                value={form.value}
                onChange={e => set('value', e.target.value)}
                step={form.type === 'percent' ? 1 : 0.01}
                min={0}
                max={form.type === 'percent' ? 100 : undefined}
                disabled={form.type === 'free_ship'}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('admin.promo.field.min_order')}>
              <input
                type="number"
                value={form.minOrder}
                onChange={e => set('minOrder', e.target.value)}
                step={0.01}
                min={0}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500"
              />
            </Field>

            <Field label={t('admin.promo.field.max_discount')}>
              <input
                type="number"
                value={form.maxDiscount}
                onChange={e => set('maxDiscount', e.target.value)}
                step={0.01}
                min={0}
                disabled={form.type !== 'percent'}
                placeholder={form.type === 'percent' ? '—' : t('admin.promo.field.percent_only')}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('admin.promo.field.starts_at')}>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={e => set('startsAt', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500"
              />
            </Field>
            <Field label={t('admin.promo.field.ends_at')}>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={e => set('endsAt', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('admin.promo.field.usage_limit')}>
              <input
                type="number"
                value={form.usageLimit}
                onChange={e => set('usageLimit', e.target.value)}
                step={1}
                min={1}
                placeholder={t('admin.promo.field.unlimited')}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500"
              />
            </Field>

            <Field label={t('admin.promo.field.per_user_limit')}>
              <input
                type="number"
                value={form.perUserLimit}
                onChange={e => set('perUserLimit', e.target.value)}
                step={1}
                min={1}
                placeholder={t('admin.promo.field.unlimited')}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => set('isActive', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">{t('admin.promo.field.is_active')}</span>
          </label>

          {errorText && (
            <div className="rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm px-3 py-2">
              {errorText}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            {t('admin.promo.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={!canSubmit || submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? t('admin.promo.saving') : editing ? t('admin.promo.save') : t('admin.promo.create')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}{required && <span className="text-error-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}
