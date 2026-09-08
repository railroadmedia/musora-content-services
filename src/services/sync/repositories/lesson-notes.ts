import SyncRepository, { Q } from './base'
import LessonNote from '../models/LessonNote'
import { RecordId } from '@nozbe/watermelondb'

export default class LessonNotesRepository extends SyncRepository<LessonNote> {
  async getNotesForContent(contentId: number) {
    return await this.queryAll(
      Q.where('content_id', contentId),
      Q.sortBy('created_at', 'asc')
    )
  }

  async createNote(contentId: number, date: string, notes: string, timestampMs: number | null = null) {
    return await this.insertOne((r) => {
      r.content_id = contentId
      r.date = date
      r.notes = notes
      r.timestamp_ms = timestampMs
    })
  }

  async updateNote(id: RecordId, notes: string) {
    return await this.updateOneId(id, (r) => {
      r.notes = notes
    })
  }

  async deleteNote(id: RecordId) {
    return await this.deleteOne(id)
  }

  /**
   * Every lesson id the user has at least one note on — for a practice tracker indicator,
   * mirroring getRecordedContentIds() but resolved from the local, already-synced table
   * rather than a network call.
   */
  async getContentIdsWithNotes(): Promise<number[]> {
    const result = await this.getAll()
    return Array.from(new Set(result.data.map((note) => note.content_id)))
  }
}
