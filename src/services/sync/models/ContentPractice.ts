import { Model } from '@nozbe/watermelondb'
import { SYNC_TABLES } from '../schema'

export default class ContentPractice extends Model {
  static table = SYNC_TABLES.CONTENT_PRACTICES
}
