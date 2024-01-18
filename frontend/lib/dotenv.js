import {i18n} from '@wendig/lib'
import {baseUrl} from './util'

const APP_URL = {
  en: process.env.APP_URL_EN,
  de: process.env.APP_URL_DE,
  fr: process.env.APP_URL_FR
}

const config = {
  APP_URL: APP_URL[i18n.locale],
  STATIC_URL: process.env.STATIC_URL,
  MIRADOR_URL: process.env.MIRADOR_URL
}

export default config
