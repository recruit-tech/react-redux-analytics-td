import { SEND_PAGE_VIEW, SEND_EVENT, FALLBACK_PAGEVIEW } from 'react-redux-analytics'
import { default as analyticsMiddleware } from 'react-redux-analytics'
import isBrowser from 'is-in-browser';
import debugFactory from 'debug'
import { debugNamespace, errorNamespace } from './const'
import Treasure from './Treasure'
import { filterVariables, filterAction } from './filters'

const debug = debugFactory(debugNamespace)
const error = debugFactory(errorNamespace)

export default ({
   config,
   variablesFilter = null,
   pageViewFilter = null,
   eventFilter = null,
   debug = false,
  }) => {

  if(!isBrowser){
    return ({ dispatch, getState }) => (next) => (action) => {
      error('treasureMiddleware does not work at server side')
      return next(action)
    }
  }
  const td = new Treasure({ config })
  const filterVars = filterVariables(variablesFilter)
  const filterPageView = filterAction('pageview')(pageViewFilter)
  const filterEvent = filterAction('event')(eventFilter)

  if(debug){
    window._treasure = td
  }

  return ({ dispatch, getState }) => (next) => (action) => {
    const { type, payload } = action
    switch (type){
      case SEND_PAGE_VIEW:
        filterPageView(action) && td.sendPageView({
          location: payload.location,
          variables: filterVars(payload.variables),
        })
        break
      case SEND_EVENT:
        filterEvent(action) && td.sendEvent({
          eventName: payload.eventName,
          variables: filterVars(payload.variables),
        })
        break
      case FALLBACK_PAGEVIEW:
        td.sendPageView({
          location: payload.location,
          variables: { ...filterVars(payload.variables), fallbackPageView: true},
        })
      default:
        break
    }
    return next(action)
  }
}
