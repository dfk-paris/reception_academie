import {util} from '@wendig/lib'
import {Database} from '@wendig/lib'
import config from './lib/dotenv'

let dbs = null
let storage = {en: {}, de: {}}
let database = new Database()
onmessage = database.handler

const promises = []

promises.push(
  fetch(`${config.STATIC_URL}/unified.json`).then(r => r.json()).then(data => {
    storage = data.sort((a, b) => {
      b.id - a.id
    })

    database.loaded()
  })
)

const aggregate = (buckets, name, value) => {
  let keys = value || 'null'
  keys = (Array.isArray(keys) ? keys : [keys])
  keys = (keys.length == 0 ? ['null'] : keys)

  keys = keys.filter(e => e != null && e != 'null')

  for (const key of keys) {
    buckets[name] = buckets[name] || {}
    buckets[name][key] = buckets[name][key] || 0
    buckets[name][key] += 1
  }
}

const matches = (record, criteria, key, locale) => {
  if (!criteria) return true
  if (!criteria[key]) return true

  let v = record[key]
  if (!v) return false

  if (locale) v = v[locale]
  if (!v) return false

  for (const c of criteria[key].split('|')) {
    if (c == v) return true
  }

  return false
}

const matchesAnyOf = (record, criteria, criteriaKey, recordKey = null) => {
  if (!criteria) return true
  if (!criteria[criteriaKey]) return true

  recordKey = recordKey || criteriaKey
  const list = criteria[criteriaKey].split('|')

  for (const c of list) {
    if (record[recordKey].indexOf(c) != -1) return true
  }

  return false
}

const matchesTerms = (record, locale, terms) => {
  if (!terms) return true

  const title = util.fold(record['title'][locale])
  const artist = util.fold(record['artists'].join(' '))
  const id = `${record['id']}`

  for (const token of terms.split(/\s+/)) {
    const c = util.fold(token)
    const m = (
      title.includes(c) ||
      artist.includes(c) ||
      c == id
    )
    if (!m) return false
  }

  return true
}

const sanitizeCriteria = (input) => {
  let criteria = input || {}
  criteria['page'] = parseInt(criteria['page'] || 1)
  criteria['per_page'] = parseInt(criteria['per_page'] || 24)
  criteria['locale'] = criteria['locale'] || 'en'

  return criteria
}

const paginate = (records, criteria) => {
  const {page, per_page} = criteria
  const total = records.length
  const start = (criteria.page - 1) * criteria.per_page
  const results = records.slice(start, start + criteria.per_page)

  return {
    page,
    per_page,
    total,
    results
  }
}

const aggregateRoom = (hierarchy, record) => {
  for (const [inventoryNo, rooms] of Object.entries(record['room'])) {
    const inventory = {1715: 'guerin', 1781: 'argenville'}[inventoryNo]
    const [r, e] = rooms

    hierarchy[inventory] = hierarchy[inventory] || {}
    hierarchy[inventory][r] = hierarchy[inventory][r] || {count: 0, exacts: {}}
    hierarchy[inventory][r]['count'] += 1
    hierarchy[inventory][r]['exacts'][e] = hierarchy[inventory][r]['exacts'][e] || 0
    hierarchy[inventory][r]['exacts'][e] += 1
  }
}

database.action('query', data => {
  let criteria = sanitizeCriteria(data.criteria)
  const locale = criteria['locale']
  criteria['page'] = criteria['page']
  criteria['per_page'] = criteria['per_page']

  let buckets = {
    'inventory': {},
    'type': {},
    'medium': {},
    'technique': {},
    'collection': {},
    'artists': {}
  }

  let roomHierarchy = {}

  let results = storage.filter(r => {
    aggregate(buckets, 'artists', r['artists'])
    aggregate(buckets, 'inventory', r['inventories'])
    aggregate(buckets, 'type', r['type'])
    aggregate(buckets, 'technique', r['technique'][locale])
    aggregate(buckets, 'medium', r['medium'][locale])
    aggregate(buckets, 'collection', r['collection'][locale])
    aggregateRoom(roomHierarchy, r)
    
    if (criteria.id) {
      if (!Array.isArray(criteria.id)) {
        criteria.id = [criteria.id]
      }

      let found = false
      for (const id of criteria.id) {
        if (r['id'] == id) found = true
      }

      if (!found) return false
    }
  
    if (!matchesTerms(r, locale, criteria['terms'])) return false


    if (!matchesAnyOf(r, criteria, 'artist', 'artists')) return false
    if (!matchesAnyOf(r, criteria, 'inventory', 'inventories')) return false

    if (!matches(r, criteria, 'type')) return false
    if (!matches(r, criteria, 'technique', locale)) return false
    if (!matches(r, criteria, 'medium', locale)) return false
    if (!matches(r, criteria, 'collection', locale)) return false

    if (criteria['inventory']) {
      let c = criteria['room']
      let value = r['room'][criteria['inventory']][0]
      if (c && c != value) return false

      c = criteria['exact']
      value = r['room'][criteria['inventory']][1]
      if (c && c != value) return false
    }

    return true
  })

  // sorting buckets
  for (const k of Object.keys(buckets)) {
    const docs = Object.entries(buckets[k]).map(e => {
      return {
        key: e[0] == 'null' ? null : e[0],
        count: e[1]
      }
    })
    buckets[k] = util.sortBy(docs, d => d.count).reverse()
  }

  for (const k of Object.keys(buckets)) {
    buckets[k] = elastify(buckets[k])
  }

  let rooms = {}
  for (const inventory of Object.keys(roomHierarchy)) {
    const h = roomHierarchy[inventory]

    rooms[inventory] = Object.keys(h).filter(e => e != 'undefined').map(roomName => {
      const room = h[roomName]
      const exactNames = Object.keys(room['exacts']).filter(e => e != 'undefined')

      const item = {
        name: roomName,
        count: room['count'],
        exacts: exactNames.map(e => {
          return {
            name: e,
            count: room['exacts'][e]
          }
        })
      }

      item['exacts'] = util.sortBy(item['exacts'], e => e.count).reverse()

      return item
    })

    rooms[inventory] = util.sortBy(rooms[inventory], e => e.count).reverse()
  }
  
  const paginate = (records, criteria) => {
    const {page, per_page} = criteria
    const total = records.length
    const start = (criteria.page - 1) * criteria.per_page
    const results = records.slice(start, start + criteria.per_page)

    return {
      page,
      per_page,
      total,
      results
    }
  }

  let response = paginate(results, criteria)
  response.buckets = buckets
  response.rooms = rooms

  return response
})

const elastify = (agg) => {
  const result = {}
  result['buckets'] = agg.map(e => {
    const key = e['key']
    const doc_count = e['count']

    return {key, doc_count}
  })

  return result
}
