'use client'

import { useI18n } from '@/i18n/I18nContext'
import ErrorView from './ErrorView'

export default function NotFoundView() {
  const { t } = useI18n()
  return (
    <ErrorView
      code={404}
      eyebrow={t('error.404.eyebrow')}
      title={t('error.404.title')}
      description={t('error.404.description')}
      primary={{ label: t('error.404.cta_home'), href: '/' }}
      secondary={{ label: t('error.404.cta_menu'), href: '/#menu' }}
    />
  )
}
