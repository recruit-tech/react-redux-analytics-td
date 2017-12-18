import debugFactory from 'debug'
import isBrowser from 'is-in-browser';
import { pickBy } from 'lodash/fp'
import { configKeyTd, debugNamespace, errorNamespace } from './const'
import defaultConfig from './default.config.js'
import { composeLocationString } from './utils'

const debug = debugFactory(debugNamespace)
const error = debugFactory(errorNamespace)

/**
 *  Treasure Data Javascript SDK wrapper
 */
 export default class Treasure{
  constructor({
    config = {},
  }) {
    if(!isBrowser){
      error('td-js-sdk cannot be used outside browser!')
      return
    }
    //state initialization
    this.isFirstPageView = true

    //config
    this.config = this.mergeConfig(defaultConfig, config)
    this.debugLogConfig()

    //instantiate tdk-js-sdk
    const tdConfig = this.config[configKeyTd]
    const TdJsSdk = require('td-js-sdk')
    this.td = new TdJsSdk(tdConfig)
    debug('initialized td-js-sdk with following config')
    debug(tdConfig)

    //helpers
    this.composeLocation = this.config.urlFormat ? 
      composeLocationString(this.config.urlFormat) : (location) => location
  }

  //protected:
  mergeConfig(defaultConfig, config = {}) {
    return {
      ...defaultConfig,
      ...config,
      [configKeyTd]: {
        ...defaultConfig[configKeyTd],
        ...config[configKeyTd],
      },
    }
  }

  //called only once when entered the site
  firstPage({ location }) {
    //document.referrer is correct only at the first page
    this.location = {
      current: location,
      referrer: document.referrer,
    }
    this.isFirstPageView = false
  }

  //called when the (virtual) page is moved
  pageChanged({ location = null }) {
    //referrer has to be set manually with SPA
    this.location.referrer = this.location.current
    this.location.current = location || this.location.current
  }
  
  //protected:
  debugLogConfig(){
    this.config.dryRun && debug(`***** working in dry-run mode (track will not be sent) *****`)
    debug(`page view track will be recored in '${this.config.pageViewTable}' table`)
    debug(`event track will be recored in '${this.config.eventTable}' table`)
    debug(`td_* values will${this.config.sendTdValues ? '' : ' NOT' } be merged`)
    debug(`falsy values in variables will ${this.config.sendFalsyValues ? 'be sent' : 'be omitted'}`)
    this.config.sendReferrer && debug(`referrer will be set in '${this.config.referrerKey}' key`)
    this.config.sendLocation && debug(`location will be set in '${this.config.locationKey}' key`)
    debug(`eventName will be set to '${this.config.eventNameKey}' key`)
    this.config.urlFormat && debug(`location and referrer will be formatted. rule: ${JSON.stringify(this.config.urlFormat)}`)
    debug(`config set: ${JSON.stringify(this.config)}`)
  }

  sendPageView({location, variables}){
    if (this.isFirstPageView) {
      this.firstPage({location})
    }else{
      this.pageChanged({location})
    }
    const composedVars = this.composeVariables({ variables })
    this.track('pageView', composedVars)
    debug(`pageView: ${JSON.stringify(composedVars)}`)
  }

  sendEvent({ variables, eventName }){
    const composedVars = this.composeVariables({ variables, eventName })
    this.track('event', composedVars)
    debug(`event(${eventName}): ${JSON.stringify(composedVars)}`)
  }
  
  //TODO(takanashi): write error handler
  track(type, variables){
    if(this.config.dryRun){
      return
    }
    const table = type === 'pageView' ? this.config.pageViewTable : this.config.eventTable
    if(this.config.sendTdValues){
      this.td.trackEvent(table, variables)
    }else{
      this.td.addRecord(table, variables)
    }
  }

  //protected:
  composeVariables({ variables, eventName }) {
    const composed = { ...variables } 
    if(this.config.sendReferrer){
      composed[this.config.referrerKey] = this.composeLocation(this.location.referrer)
    }
    if(this.config.sendLocation){
      composed[this.config.locationKey] = this.composeLocation(this.location.current)
    }
    if(eventName){
      composed[this.config.eventNameKey] = eventName
    }
    return this.config.sendFalsyValues ? composed : pickBy(Boolean)(composed)
  }
}