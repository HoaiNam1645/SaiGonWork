'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { formatEuro } from '@/lib/delivery'
import type { StoreSettings } from '@/lib/storeApi'

const MAX_BYTES = 8 * 1024 * 1024 // 8MB — khớp giới hạn route handler
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

interface Props {
  store:      StoreSettings
  amount:     number
  /** Nội dung chuyển khoản khách ghi vào Verwendungszweck (vd "sđt - tên"). */
  transferContent?: string
  /**
   * Gọi khi khách đã upload ảnh chứng từ + bấm "Xác nhận".
   * Nhận URL ảnh (dạng /banking/xxx) đã upload lên public/banking.
   */
  onConfirm:  (proofUrl: string) => Promise<void> | void
  onClose:    () => void
  submitting?: boolean
  errorText?:  string | null
}

export default function BankTransferModal({
  store, amount, transferContent, onConfirm, onClose, submitting, errorText,
}: Props) {
  const { locale } = useI18n()
  const isDe = locale === 'de'

  const L = {
    title:        isDe ? 'Banküberweisung' : 'Bank transfer',
    stepHint1:    isDe ? 'Schritt 1/2 — Daten kopieren & überweisen' : 'Step 1/2 — Copy details & transfer',
    stepHint2:    isDe ? 'Schritt 2/2 — Beleg hochladen' : 'Step 2/2 — Upload receipt',
    bankName:     isDe ? 'Bank' : 'Bank',
    accountName:  isDe ? 'Kontoinhaber' : 'Account holder',
    accountNo:    isDe ? 'Kontonummer / IBAN' : 'Account number / IBAN',
    amount:       isDe ? 'Betrag' : 'Amount',
    reference:    isDe ? 'Verwendungszweck' : 'Reference',
    nextBtn:      isDe ? 'Ich habe überwiesen →' : 'I have transferred →',
    uploadLabel:  isDe ? 'Überweisungsbeleg' : 'Transfer receipt',
    uploadHint:   isDe ? 'Screenshot/Foto der Überweisung (JPG, PNG, WebP · max. 8 MB).'
                       : 'Screenshot/photo of your transfer (JPG, PNG, WebP · max 8 MB).',
    choose:       isDe ? 'Bild auswählen' : 'Choose image',
    change:       isDe ? 'Ändern' : 'Change',
    remove:       isDe ? 'Entfernen' : 'Remove',
    uploading:    isDe ? 'Wird hochgeladen…' : 'Uploading…',
    back:         isDe ? '← Zurück' : '← Back',
    confirm:      isDe ? 'Bestätigen & bestellen' : 'Confirm & place order',
    submitting:   isDe ? 'Wird verarbeitet…' : 'Submitting…',
    proofRequired: isDe ? 'Bitte lade einen Überweisungsbeleg hoch.' : 'Please upload a transfer receipt.',
    tooLarge:     isDe ? 'Datei zu groß (max. 8 MB).' : 'File too large (max 8 MB).',
    badType:      isDe ? 'Nur Bilddateien (JPG, PNG, WebP).' : 'Images only (JPG, PNG, WebP).',
    uploadFailed: isDe ? 'Upload fehlgeschlagen. Bitte erneut versuchen.' : 'Upload failed. Please try again.',
  }

  const [step, setStep] = useState<1 | 2>(1)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const busy = uploading || !!submitting

  // ESC closes (when not busy)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  // Revoke object URL khi đổi ảnh / unmount (tránh leak memory)
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 1500)
    } catch {
      /* ignore */
    }
  }

  function pickFile(f: File | null) {
    if (!f) return
    if (!ACCEPTED.includes(f.type)) { setLocalErr(L.badType); return }
    if (f.size > MAX_BYTES)         { setLocalErr(L.tooLarge); return }
    setLocalErr(null)
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(f) })
    setFile(f)
  }

  function clearFile() {
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleConfirm() {
    if (!file) { setLocalErr(L.proofRequired); return }
    setLocalErr(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/upload/bank-proof', { method: 'POST', body: fd })
      if (!res.ok) { setLocalErr(L.uploadFailed); return }
      const data = (await res.json()) as { url?: string }
      if (!data.url) { setLocalErr(L.uploadFailed); return }
      await onConfirm(data.url)
    } catch {
      setLocalErr(L.uploadFailed)
    } finally {
      setUploading(false)
    }
  }

  const bank = store.payment
  const amountStr = formatEuro(amount)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ backgroundColor: 'rgba(20, 20, 19, 0.55)' }}
      onClick={() => { if (!busy) onClose() }}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#faf9f5] p-6"
        style={{ boxShadow: '0 0 0 1px #f0eee6, 0 30px 60px rgba(0,0,0,0.20)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-display text-[#141413] text-[20px] font-medium" style={{ lineHeight: 1.2 }}>
            {L.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="-mt-1 -mr-1 w-8 h-8 inline-flex items-center justify-center text-[#87867f] hover:text-[#141413] disabled:opacity-40 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="text-[12px] text-[#87867f] mb-5">
          {step === 1 ? L.stepHint1 : L.stepHint2}
        </div>

        {/* STEP 1: thông tin CK — copy từng dòng bằng icon (không dùng QR) */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              className="rounded-xl bg-white p-4 text-[13px]"
              style={{ boxShadow: '0 0 0 1px #e8e6dc' }}
            >
              <InfoRow label={L.bankName}    value={bank.bankName} />
              <InfoRow
                label={L.accountName}
                value={bank.bankAccountName}
                copyable
                onCopy={(v) => copy(v, 'name')}
                copiedNow={copiedKey === 'name'}
              />
              <InfoRow
                label={L.accountNo}
                value={bank.bankAccountNo}
                copyable
                onCopy={(v) => copy(v.replace(/\s+/g, ''), 'acc')}
                copiedNow={copiedKey === 'acc'}
              />
              <InfoRow
                label={L.amount}
                value={amountStr}
                accent
                copyable
                onCopy={() => copy(String(amount.toFixed(2)), 'amt')}
                copiedNow={copiedKey === 'amt'}
              />
              {transferContent && (
                <InfoRow
                  label={L.reference}
                  value={transferContent}
                  accent
                  copyable
                  onCopy={(v) => copy(v, 'ref')}
                  copiedNow={copiedKey === 'ref'}
                  last
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full bg-[#c96442] hover:bg-[#d97757] text-[#faf9f5] font-medium text-[15px] py-3 rounded-xl transition-colors"
              style={{ boxShadow: '0 0 0 1px #c96442' }}
            >
              {L.nextBtn}
            </button>
          </div>
        )}

        {/* STEP 2: upload proof image */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <span className="block text-[10px] uppercase text-[#87867f] font-medium mb-1.5" style={{ letterSpacing: '0.5px' }}>
                {L.uploadLabel}<span className="text-[#c96442] ml-0.5">*</span>
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />

              {previewUrl ? (
                <div
                  className="rounded-xl bg-white p-3"
                  style={{ boxShadow: '0 0 0 1px #e8e6dc' }}
                >
                  <div className="relative w-full rounded-lg overflow-hidden bg-[#f5f4ee]" style={{ maxHeight: 320 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="w-full h-auto max-h-[320px] object-contain mx-auto"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[12px] text-[#87867f] truncate max-w-[55%]" title={file?.name}>
                      {file?.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={busy}
                        className="text-[12px] text-[#c96442] hover:text-[#d97757] font-medium disabled:opacity-50"
                      >
                        {L.change}
                      </button>
                      <button
                        type="button"
                        onClick={clearFile}
                        disabled={busy}
                        className="text-[12px] text-[#87867f] hover:text-[#141413] font-medium disabled:opacity-50"
                      >
                        {L.remove}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl bg-white py-8 px-4 flex flex-col items-center justify-center gap-2 text-center transition-colors hover:bg-[#fcfbf7]"
                  style={{ boxShadow: '0 0 0 1px #e8e6dc' }}
                >
                  <svg className="w-8 h-8 text-[#c96442]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className="text-[14px] text-[#141413] font-medium">{L.choose}</span>
                </button>
              )}

              <div className="text-[12px] text-[#87867f] mt-1.5" style={{ lineHeight: 1.5 }}>
                {L.uploadHint}
              </div>
            </div>

            {(localErr || errorText) && (
              <div
                className="rounded-xl px-3.5 py-2.5 text-[13px]"
                style={{ backgroundColor: '#fef3f2', boxShadow: '0 0 0 1px #f4cdca', color: '#b53333' }}
              >
                {localErr ?? errorText}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={busy}
                className="px-4 py-3 rounded-xl text-[14px] text-[#5e5d59] hover:text-[#141413] disabled:opacity-50 transition-colors"
              >
                {L.back}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy || !file}
                className="flex-1 bg-[#c96442] hover:bg-[#d97757] disabled:bg-[#e8e6dc] disabled:text-[#87867f] disabled:cursor-not-allowed text-[#faf9f5] font-medium text-[15px] py-3 rounded-xl transition-colors"
                style={{ boxShadow: (!busy && file) ? '0 0 0 1px #c96442' : 'none' }}
              >
                {uploading ? L.uploading : submitting ? L.submitting : L.confirm}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({
  label, value, accent, copyable, onCopy, copiedNow, last,
}: {
  label:    string
  value:    string | null
  accent?:  boolean
  copyable?: boolean
  onCopy?:  (v: string) => void
  /** true trong ~1.5s sau khi copy → hiện icon check xanh */
  copiedNow?: boolean
  last?:    boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-2 ${last ? '' : 'border-b border-[#f0eee6]'}`}
    >
      <span className="text-[#87867f] text-[12px] uppercase" style={{ letterSpacing: '0.5px' }}>
        {label}
      </span>
      <span className="flex items-center gap-2 min-w-0">
        <span
          className={
            (accent ? 'text-[#c96442] font-medium ' : 'text-[#141413] ') +
            'text-[14px] truncate text-right'
          }
          title={value ?? ''}
        >
          {value ?? '—'}
        </span>
        {copyable && value && (
          <button
            type="button"
            onClick={() => onCopy?.(value)}
            aria-label="Kopieren"
            className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
              copiedNow ? 'text-[#4a7c2a]' : 'text-[#c96442] hover:text-[#d97757] hover:bg-[#faf9f5]'
            }`}
          >
            {copiedNow ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        )}
      </span>
    </div>
  )
}
