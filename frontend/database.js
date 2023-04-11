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

  return v == criteria[key]
}

const matchesAnyOf = (record, criteria, criteriaKey, recordKey = null) => {
  if (!criteria) return true
  if (!criteria[criteriaKey]) return true

  recordKey = recordKey || criteriaKey
  const list = criteria[criteriaKey].split('|')

  for (const c of list) {
    if (record[recordKey].indexOf(c) == -1) return false
  }

  return true
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

  // let years = new Map()

  let results = storage.filter(r => {
    // const id = r[0]
    // const record = r[1]
    
    if (criteria.id) {
      if (!Array.isArray(criteria.id)) {
        criteria.id = [criteria.id]
      }

      let found = false
      for (const id of criteria.id) {
        // console.log(id, r['id'], r['id'] == id)
        if (r['id'] == id) found = true
      }

      if (!found) return false
    }

    if (!matchesTerms(r, locale, criteria['terms'])) return false

    // if (!matches(r, criteria, 'db')) return false
    // if (!matches(r, criteria, 'kind')) return false

    // if (criteria.name) {
    //   const value = util.fold(`${r['n']} ${r['dn']}`)
    //   const terms = criteria.name.split(/\s/)
    //   const m = terms.every(t => {
    //     const regex = new RegExp(util.regEscape(`${util.fold(t)}`), 'i')
    //     return value.match(regex)
    //   })
    //   if (!m) {return false}
    // }

    if (!matchesAnyOf(r, criteria, 'artist', 'artists')) return false
    if (!matchesAnyOf(r, criteria, 'inventory', 'inventories')) return false

    if (!matches(r, criteria, 'type')) return false
    if (!matches(r, criteria, 'technique', locale)) return false
    if (!matches(r, criteria, 'medium', locale)) return false
    if (!matches(r, criteria, 'collection', locale)) return false

    // if (r['years']) {
    //   const range = util.range(r['years'])
    //   for (const y of range) {
    //     const v = years.get(y) || 0
    //     years.set(y, v + 1)
    //   }
    // }

    // let args = [criteria['from'], criteria['to'], criteria['include_no_years']]
    // if (!matchesYear(r, ...args)) return false

    aggregate(buckets, 'artists', r['artists'])
    aggregate(buckets, 'inventory', r['inventories'])
    aggregate(buckets, 'type', r['type'])
    aggregate(buckets, 'technique', r['technique'][locale])
    aggregate(buckets, 'medium', r['medium'][locale])
    aggregate(buckets, 'collection', r['collection'][locale])

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

  // results = results.sort((x, y) => {
  //   const xt = (x['name'] || '').trim()
  //   const yt = (y['name'] || '').trim()
  //   if (xt == yt) return 0
  //   return xt < yt ? -1 : 1 
  // })

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
