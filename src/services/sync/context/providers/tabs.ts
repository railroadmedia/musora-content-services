import BaseContextProvider from "./base";

export default class BaseTabsProvider extends BaseContextProvider<boolean> {
  getValue() {
    return false
  }
}
