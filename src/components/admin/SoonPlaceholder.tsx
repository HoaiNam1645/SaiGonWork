import { useI18n } from '@/i18n/I18nContext'

export default function SoonPlaceholder() {
  const { t } = useI18n()
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-8 py-16 text-center shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center text-[24px]">
        ✦
      </div>
      <h2 className="mt-4 text-lg text-gray-900 font-semibold">
        {t('admin.soon.title')}
      </h2>
      <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
        {t('admin.soon.body')}
      </p>
    </div>
  )
}
