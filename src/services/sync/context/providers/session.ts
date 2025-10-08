import BaseContextProvider from "./base";

export default abstract class BaseSessionProvider extends BaseContextProvider {
  abstract getClientId(): string
  getSessionId(): string | null {
    return null
  }
}
