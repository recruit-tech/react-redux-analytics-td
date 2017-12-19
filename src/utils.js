import {entries} from 'lodash/fp';
import { clearFields as defaultClearFields } from './const'

export const composeLocationString = (urlFormat = {}) => (location) => {
  if(!location){
    return null
  }
  if(typeof location === 'string'){
    return location
  }
  const { dispalyHostname, displayProtocol, showQuery, showHash }  = urlFormat
  const { pathname, search, hash } = location
  //override window.location values by config (i.e to normalize http to https in ReportSuite, aggregate subdomain pages,...)
  const prefix = (displayProtocol || window.location.protocol) + '//'
    + (dispalyHostname || window.location.hostname)

  let suffix = pathname
  suffix += showQuery ? search : ''
  suffix += showHash ? hash : ''
  return prefix + suffix
}
