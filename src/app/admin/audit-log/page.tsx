'use client'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import SoonPlaceholder from '@/components/admin/SoonPlaceholder'
import { useI18n } from '@/i18n/I18nContext'

export default function AdminAuditLogPage() {
  const { t } = useI18n()
  return (
    <>
      <AdminPageHeader eyebrow="Admin" title={t('admin.nav.audit')} />
      <SoonPlaceholder />
    </>
  )
}
