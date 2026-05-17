'use client'

import { useI18n } from '@/i18n/I18nContext'
import ErrorView from './ErrorView'

interface Props {
  /** Path để redirect lại sau khi đăng nhập (vd "/orders"). */
  next?: string
}

export default function UnauthorizedView({ next }: Props) {
  const { t } = useI18n()
  const signinHref = next
    ? `/auth/login?next=${encodeURIComponent(next)}`
    : '/auth/login'

  return (
    <ErrorView
      code={401}
      eyebrow={t('error.401.eyebrow')}
      title={t('error.401.title')}
      description={t('error.401.description')}
      primary={{ label: t('error.401.cta_signin'), href: signinHref }}
      secondary={{ label: t('error.401.cta_home'), href: '/' }}
    />
  )
}
