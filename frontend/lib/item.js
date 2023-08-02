import {i18n} from '@wendig/lib'
import config from '../lib/dotenv'
import {baseUrl} from '../lib/util'

export default class Item {
  constructor(data) {
    this.d = data
  }

  id() {
    return this.d['id']
  }

  url() {
    return `${baseUrl()}#/records/${this.id()}`
  }

  title() {
    return this.d['title'][i18n.locale]
  }

  date() {
    return this.d['date']
  }

  orientation() {
    return this.d['orientation']
  }

  artistCount() {
    return this.d['artists_human'][i18n.locale].length
  }

  artistList() {
    return this.d['artists_human'][i18n.locale].join(', ')
  }

  artistWikidataIds() {
    return this.d['artists_wikidata']
  }

  artistULANIds() {
    return this.d['artists_ulan']
  }

  hasImage() {
    return !!this.d['image']
  }

  imageUrl() {
    return `${config.STATIC_URL}${this.d['image']}`
  }

  additionalUrls() {
    return (this.d['additional_images'] || []).map(e => {
      return `${config.STATIC_URL}${e}`
    })
  }

  credits() {
    return this.d['credits']
  }

  medium() {
    return this.d['medium'][i18n.locale]
  }

  technique() {
    return this.d['technique'][i18n.locale]
  }

  dimensions() {
    return this.d['dims_human']
  }

  wh() {
    return this.d['dims']
  }

  location() {
    return this.d['location']
  }

  inventoryNo() {
    return this.d['inventory_no']
  }

  inventories() {
    return this.d['inventories']
  }

  collectionLink() {
    return this.d['collection_link']
  }

  biblio() {
    return this.d['biblio']
  }

  type() {
    return this.d['type']
  }

  room() {
    return this.d['room']
  }

  dimClass() {
    const area = this.d['area']

    if (area == -1) return 'disabled'

    if (area < 2500) return 'small' // 50²
    if (area < 22500) return 'medium' // 150²

    return 'large'
  }

  json() {
    return JSON.stringify(this.d, null, 2)
  }
}
