import strftime from 'strftime'
import {i18n} from '@wendig/lib'
import config from '../lib/dotenv'
import {baseUrl} from '../lib/util'

const toDate = {
  en: strftime,
  fr: strftime.localize({
    identifier: 'fr-FR',
    months: [
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre'
    ]
  })
}

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

  humanAcquisitionDate() {
    const value = this.d['acquisition_date']
    if (!value) return null
    if (!value['date']) return null

    value['date'][1] -= 1

    const date = new Date(...value['date'])

    const format = "%e %B %Y"
    return toDate[i18n.locale](format, date)
  }

  orientation() {
    return this.d['orientation']
  }

  artistCount() {
    return this.d['artists_human'][i18n.locale].length
  }

  artistList() {
    let result = this.d['artists_human'][i18n.locale].join(', ')
    const other = this.d['after_other_artist']

    if (other) {
      result = `${result} (${i18n.translate('after')} ${other})`
    }

    return result
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
    const t = this.d['type'] || {}
    return t[i18n.locale]
  }

  room() {
    return this.d['room']
  }

  studyImage() {
    return `${config.STATIC_URL}${this.d['study']['image']}`
  }

  studyCaption() {
    return this.d['study'][i18n.locale]
  }

  hasStudy() {
    return !!this.d['study']
  }

  hasCopy() {
    return !!this.d['copy']
  }

  copyImage() {
    return `${config.STATIC_URL}${this.d['copy']['image']}`
  }

  copyCaption() {
    return this.d['copy'][i18n.locale]
  }

  hasOriginal() {
    return !!this.d['original']
  }

  originalImage() {
    return `${config.STATIC_URL}${this.d['original']['image']}`
  }

  originalCaption() {
    return this.d['original'][i18n.locale]
  }

  hasAnyImage() {
    return (
      this.hasImage() ||
      this.hasCopy() ||
      this.hasStudy() ||
      this.hasOriginal()
    )
  }

  plateLink() {
    return this.d['plate_link']
  }

  notes() {
    return this.d['notes'][i18n.locale]
  }

  descriptionUnident() {
    return this.d['description_unident']
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
