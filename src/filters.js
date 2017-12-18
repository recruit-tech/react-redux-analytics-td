import debugFactory from 'debug'
import { isFunction, pickBy } from 'lodash/fp'
import { debugNamespace, errorNamespace } from './const'

const debug = debugFactory(debugNamespace)
const error = debugFactory(errorNamespace)

export const filterVariables = (variableFilter = null) => {
  let picker = null
  if(!variableFilter && !isFunction(variableFilter) && !Array.isArray(variableFilter)){
    error(`variables filter must be function or array. But ${typeof variableFilter} is provided.`)
  }
  if(isFunction(variableFilter)){
    picker = pickBy((v, k) => variableFilter(k, v))
  } else if(Array.isArray(variableFilter)){
    picker = pickBy((v, k) => variableFilter.includes(k))
  }
  return (variables) => {
    if(!picker){
      return variables
    }
    return picker(variables)
  }
}

export const filterAction = (type) => (payloadFilter = null) => {
  if(payloadFilter && !isFunction(payloadFilter)){
    error(`payload filter for ${type} must be function. But ${typeof payloadFilter} is provided.`)
  }
  return ({ payload }) => {
    if(!payloadFilter){
      return true
    }
    return filter(payload)
  }
}