import * as riot from 'riot'

import {RiotPlugins, BusRiotPlugin, i18n, Url} from '@wendig/lib'

import DfkActiveFilters from '@dfk-paris/frontend/src/components/active_filters.riot'
import DfkFacet from '@dfk-paris/frontend/src/components/facet.riot'
import DfkIcon from '@dfk-paris/frontend/src/components/icon.riot'
import DfkInput from '@dfk-paris/frontend/src/components/input.riot'
import DfkPagination from '@dfk-paris/frontend/src/components/pagination.riot'

import App from './components/app.riot'
import Dims from './components/dims.riot'
import FlyIn from './components/fly_in.riot'
import Search from './components/search.riot'
import Results from './components/results.riot'
import RoutedModal from './components/routed_modal.riot'

Url.setForceFragment()

RiotPlugins.setup(riot)
riot.install(RiotPlugins.i18n)
riot.install(RiotPlugins.parent)
riot.install(RiotPlugins.setTitle)
riot.install(BusRiotPlugin)

riot.register('dfk-active-filters', DfkActiveFilters)
riot.register('dfk-facet', DfkFacet)
riot.register('dfk-icon', DfkIcon)
riot.register('dfk-input', DfkInput)
riot.register('dfk-pagination', DfkPagination)

riot.register('app', App)
riot.register('dims', Dims)
riot.register('fly-in', FlyIn)
riot.register('search', Search)
riot.register('results', Results)
riot.register('routed-modal', RoutedModal)

i18n.fetch('translations.json').then(data => {
  riot.mount('[is]')
})
