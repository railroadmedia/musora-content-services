import BaseContextProvider from "./base";

export default abstract class BaseDurabilityProvider extends BaseContextProvider {
  abstract getValue(): boolean
}
