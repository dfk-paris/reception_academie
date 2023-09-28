import {Url} from '@wendig/lib'
import config from '../lib/dotenv'
import Item from '../lib/item'

const open = (record, event = null) => {
  if (event) event.preventDefault()

  const item = (
    record instanceof Item ?
    record :
    new Item(record)
  )

  const url = Url.current()
  url.setHashPath(`/records/${item.id()}`)
  url.apply()
}

const params = () => {
  const defaults = {
    page: 1,
    per_page: 12
  }

  const url = Url.current()
  
  return Object.assign(defaults, url.hashParams())
}

const indexFor = (response, id) => {
  for (let i = 0; i < response.results.length; i++) {
    const record = response.results[i]

    if (record.id == id) {
      return i
    }
  }

  return -1
}

const baseUrl = () => {
  const url = Url.current()
  const r = url.resource().split('#')[0]
  return `${url.origin()}${r}`
}

const localeFromUrl = () => {
  const url = document.location.href
  const m = url.match(/\/(en|fr)\//)
  if (m) return m[1]

  return 'fr'
}

export {
  baseUrl,
  indexFor,
  localeFromUrl,
  open,
  params
}