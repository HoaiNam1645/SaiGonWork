'use client'

import { useI18n } from '@/i18n/I18nContext'
import ErrorView from './ErrorView'

interface Props {
  /** Role hiện tại của user — hiển thị để debug. */
  currentRole?: string
  /** Role yêu cầu của route. */
  requiredRoles?: string[]
}

export default function ForbiddenView({ currentRole, requiredRoles }: Props) {
  const { t } = useI18n()

  const detail =
    currentRole && requiredRoles && requiredRoles.length > 0
      ? `${t('error.403.description')} (current: ${currentRole}, required: ${requiredRoles.join(' / ')})`
      : t('error.403.description')

  return (
    <ErrorView
      code={403}
      eyebrow={t('error.403.eyebrow')}
      title={t('error.403.title')}
      description={detail}
      primary={{ label: t('error.403.cta_home'), href: '/' }}
    />
  )
}
