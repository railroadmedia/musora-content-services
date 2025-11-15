import EventEmitter from "../../utils/event-emitter";
import BaseContextProvider from "./base";

export default abstract class BaseConnectivityProvider extends BaseContextProvider {
  private emitter = new EventEmitter<{ change: [boolean] }>()

  abstract getValue(): boolean

  subscribe(listener: (value: boolean) => void) {
    return this.emitter.on('change', listener)
  }

  protected notifyListeners = () => this.emitter.emit('change', this.getValue())
}
