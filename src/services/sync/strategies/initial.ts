import { BaseStrategy } from '.'

export default class InitialStrategy extends BaseStrategy {
  start() {
    this.registry.forEach(({ callback }) => {
      callback('initial')
    })
  }

  stop() {}
}
