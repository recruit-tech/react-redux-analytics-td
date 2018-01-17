import debugFactory from 'debug'
import isBrowser from 'is-in-browser';
import { pickBy } from 'lodash/fp'
import defaultConfig from './default.config.js'
import { composeLocationString } from './utils'
import { 
  configKeyTd,
  debugNamespace,
  errorNamespace,
  TYPE_EVENT,
  TYPE_PAGEVIEW,
} from './const'

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
    debug(`track type will be set to '${this.config.trackTypeKey}' key`)
    this.config.sendReferrer && debug(`referrer will be set to '${this.config.referrerKey}' key`)
    this.config.sendLocation && debug(`location will be set to '${this.config.locationKey}' key`)
    debug(`eventName will be set to '${this.config.eventNameKey}' key`)
    this.config.urlFormat && debug(`location and referrer will be formatted. rule: ${JSON.stringify(this.config.urlFormat)}`)
    debug(`config set: ${JSON.stringify(this.config)}`)
  }

  async sendPageView({location, variables}){
    if (this.isFirstPageView) {
      this.firstPage({location})
    }else{
      this.pageChanged({location})
    }
    const composedVars = this.composeVariables({ variables, type: TYPE_PAGEVIEW})
    try {
      await this.track(TYPE_PAGEVIEW, composedVars)
      debug(`${this.config.dryRun ? '(dry-run)': '(tracked)'} pageview: ${JSON.stringify(composedVars)}`)
    }catch(e){
      error(`failed to send event track to the server: ${JSON.stringify(e)}`)
      throw e
    }
  }

  async sendEvent({ variables, eventName }){
    const composedVars = this.composeVariables({ variables, eventName, type: TYPE_EVENT })
    try{
      await this.track(TYPE_EVENT, composedVars)
      debug(`${this.config.dryRun ? '(dry-run)': '(tracked)'} event(${eventName}): ${JSON.stringify(composedVars)}`)
    }catch(e){
      error(`failed to send event track to the server: ${JSON.stringify(e)}`)
      throw e
    }
  }

  async track(type, variables){
    return new Promise((resolve, reject) => {
      if(this.config.dryRun){
        resolve({ dry: true })
        return
      }
      const table = this.getTableName(type)
      if(!table){
        reject('Table name must be supplied.')
      }
      const successCallback = (ret) => {
        resolve(ret)
      }
      const errorCallback = (e) => {
        reject(e)
      }
      if(this.config.sendTdValues){
        this.td.trackEvent(table, variables, successCallback, errorCallback)
      }else{
        this.td.addRecord(table, variables, successCallback, errorCallback)
      }
    })
  }

  //protected:
  getTableName(type){
    if(type === TYPE_PAGEVIEW){
      return this.config.pageViewTable
    }
    if(type === TYPE_EVENT){
      return this.config.eventTable
    }
    return null
  }

  //protected:
  composeVariables({ variables, eventName, type }) {
    const composed = { ...variables } 
    composed[this.config.trackTypeKey] = type
    if(type === TYPE_PAGEVIEW){
      if(this.config.sendReferrer){
        composed[this.config.referrerKey] = this.composeLocation(this.location.referrer)
      }
      if(this.config.sendLocation){
        composed[this.config.locationKey] = this.composeLocation(this.location.current)
      }
    }
    if(eventName){
      composed[this.config.eventNameKey] = eventName
    }
    return this.config.sendFalsyValues ? composed : pickBy(Boolean)(composed)
  }
}