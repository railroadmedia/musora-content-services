import BaseContextProvider from "./base";

export default class BaseDurabilityProvider extends BaseContextProvider<boolean> {
  getValue() {
    return true
  }
}
