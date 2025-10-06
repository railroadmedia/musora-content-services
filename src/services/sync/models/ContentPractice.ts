import BaseModel from './Base'
import { SYNC_TABLES } from '../schema'

export default class ContentPractice extends BaseModel {
  static table = SYNC_TABLES.CONTENT_PRACTICES
}
