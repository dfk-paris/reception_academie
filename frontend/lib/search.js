import config from './dotenv'

import {Search as WendigSearch} from '@wendig/lib'

export default class Search extends WendigSearch {
  constructor() {
    super(config.STATIC_URL + '/database.js')
  }

  query(criteria = {}) {
    return this.postMessage({action: 'query', criteria})
  }

  record(id) {
    const criteria = {id}
    
    return this.postMessage({action: 'query', criteria})
  }
}
