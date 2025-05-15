export interface HttpError {
  status: number
  statusText: string
  url: string
  method: string
  body?: any
}
