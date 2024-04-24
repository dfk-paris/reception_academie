import {util} from '@wendig/lib'
import {Database} from '@wendig/lib'
import config from './lib/dotenv'

let dbs = null
let storage = {}
let database = new Database()
onmessage = database.handler

const promises = []

promises.push(
  fetch(`${config.STATIC_URL}/unified.json`).then(r => r.json()).then(data => {
    storage['records'] = data.sort((a, b) => {
      b.id - a.id
    })
  })
)

promises.push(
  fetch(`${config.STATIC_URL}/coordinates.json`).then(r => r.json()).then(data => {
    storage['coordinates'] = data
  })
)

Promise.all(promises).then(values => {
  database.loaded()
})

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

const matchesInventory = (record, criteria) => {
  if (!criteria) return true

  return record['inventories'].includes(criteria)
}

const matchesAnyOf = (record, criteria, criteriaKey, recordKey = null, locale = null) => {
  if (!criteria) return true
  if (!criteria[criteriaKey]) return true

  recordKey = recordKey || criteriaKey
  const list = criteria[criteriaKey].split('|')

  for (const c of list) {
    let value = record[recordKey]
    if (locale) value = value[locale]
    if (!value) return false

    if (value.includes(c)) return true
  }

  return false
}

const matchesTerms = (record, locale, terms) => {
  if (!terms) return true

  const title = util.fold(record['title'][locale])
  const artist = util.fold(record['artists'].join(' '))
  let notes = record['notes'][locale] || []
  notes = util.fold(notes.join(' '))
  let descriptionUnident = record['description_unident'] || []
  descriptionUnident = util.fold(descriptionUnident.join(' '))
  const id = `${record['id']}`
  const collection = util.fold(record['collection'][locale]) || ''
  const location = util.fold(record['location']) || ''

  for (const token of terms.split(/\s+/)) {
    const c = util.fold(token)
    const m = (
      title.includes(c) ||
      artist.includes(c) ||
      notes.includes(c) ||
      descriptionUnident.includes(c) ||
      location.includes(c) ||
      // collection.includes(c) ||
      c == id
    )
    if (!m) return false
  }

  return true
}

const matchesRoom = (record, criteria) => {
  if (!criteria['inventory']) return true
  if (!criteria['room'] && !criteria['exact']) return true

  const forInventory = record['room'][criteria['inventory']]

  let cs = criteria['room']
  if (cs) {
    if (cs.split('|').includes(forInventory[0])) return true
  }

  cs = criteria['exact']
  if (cs) {
    if (cs.split('|').includes(forInventory[1])) return true
  }

  return false
}

const matchesAcquisitionDate = (r, criteria) => {
  const adate = r['acquisition_date']
  if (!adate) return true

  let year = null
  if (adate['date']) year = adate['date'][0]
  if (adate['year_range']) year = adate['year_range'][1]

  let from = criteria['from']
  if (from) {
    from = parseInt(from)
    if (from > year) return false
  }

  let to = criteria['to']
  if (from) {
    to = parseInt(to)
    if (to < year) return false
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

const aggregateAcquisitionDate = (buckets, value) => {
  if (!value) return

  let v = null

  if (value['date']) {
    v = value['date'][0]
  }

  if (value['year_range']) {
    v = value['year_range'][1]
  }

  if (!v) return

  buckets['adate'][v] = buckets['adate'][v] || 0
  buckets['adate'][v] += 1
}

const dropBucket = (buckets, key, value) => {
  if (!value) return
  if (!buckets[key]) return

  const vs = value.split('|')
  for (const v of vs) {
    if (!buckets[key][v]) return

    delete buckets[key][v]
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
    'artists': {},
    'location': {},
    'adate': {}
  }

  let roomHierarchy = {}

  let results = storage['records'].filter(r => {
    aggregate(buckets, 'artists', r['artists'])
    aggregate(buckets, 'type', r['type'][locale])
    aggregate(buckets, 'technique', r['technique'][locale])
    aggregate(buckets, 'medium', r['medium'][locale])
    aggregate(buckets, 'collection', r['collection'][locale])
    aggregate(buckets, 'location', r['location'])
    aggregateAcquisitionDate(buckets, r['acquisition_date'])

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
    if (!matchesInventory(r, criteria['inventory'])) return false

    if (!matchesAnyOf(r, criteria, 'type', null, locale)) return false
    if (!matchesAnyOf(r, criteria, 'artist', 'artists')) return false
    if (!matchesAnyOf(r, criteria, 'technique', null, locale)) return false
    if (!matchesAnyOf(r, criteria, 'medium', null, locale)) return false
    if (!matchesAnyOf(r, criteria, 'collection', null, locale)) return false

    if (!matchesAcquisitionDate(r, criteria)) return false

    aggregateRoom(roomHierarchy, r)
    if (!matchesRoom(r, criteria)) return false

    aggregate(buckets, 'inventory', r['inventories'], criteria['inventory'])

    return true
  })

  // drop buckets reflecting active criteria
  dropBucket(buckets, 'inventory', criteria['inventory'])
  dropBucket(buckets, 'artists', criteria['artist'])
  dropBucket(buckets, 'collection', criteria['collection'])
  dropBucket(buckets, 'medium', criteria['medium'])
  dropBucket(buckets, 'type', criteria['type'])
  if (criteria['inventory']) {
    buckets['inventory'] = {}
  }
  // if (criteria['room']) {
  //   roomHierarchy = {}
  // }

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

  buckets['adate'] = util.sortBy(buckets['adate'], d => d.key)

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

database.action('coordinates', data => {
  return storage['coordinates']
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
