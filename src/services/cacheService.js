import { globalConfig } from './config'

const getItem = async (key) => {
  return globalConfig.isMA ? await cache.getItem(key) : cache.getItem(key)
}

const setItem = async (key, value) => globalConfig.localStorage.setItem(key, value)

const removeItem = async (key) => globalConfig.localStorage.removeItem(key)

export default {
  getItem,
  setItem,
  removeItem,
}
