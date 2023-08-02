import * as riot from 'riot'

import {RiotPlugins, BusRiotPlugin, i18n, Url} from '@wendig/lib'
window.Url = Url

import DfkActiveFilters from '@dfk-paris/frontend/src/components/active_filters.riot'
import DfkFacet from '@dfk-paris/frontend/src/components/facet.riot'
import DfkIcon from '@dfk-paris/frontend/src/components/icon.riot'
import DfkInput from '@dfk-paris/frontend/src/components/input.riot'
import DfkPagination from '@dfk-paris/frontend/src/components/pagination.riot'

import App from './components/app.riot'
import Dims from './components/dims.riot'
import FlyIn from './components/fly_in.riot'
import HelpTrigger from './components/help_trigger.riot'
import Search from './components/search.riot'
import Results from './components/results.riot'
import RoomFacet from './components/room_facet.riot'
import RoutedModal from './components/routed_modal.riot'

import config from './lib/dotenv'

Url.setForceFragment()

i18n.fetch(`${config.STATIC_URL}/translations.json`).then(data => {
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
  riot.register('help-trigger', HelpTrigger)
  riot.register('search', Search)
  riot.register('results', Results)
  riot.register('room-facet', RoomFacet)
  riot.register('routed-modal', RoutedModal)

  riot.mount('[is]')
})
