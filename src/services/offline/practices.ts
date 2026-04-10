import { db } from '../sync'
import { Q } from '@nozbe/watermelondb'
import dayjs from 'dayjs'

export async function getPracticeSessionsOffline(
  offlineTimestamp: number,
  { day = dayjs().format('YYYY-MM-DD') }: { day?: string } = {}
) {

  const query = await db.practices.queryAll(
    Q.where('updated_at', Q.gte(offlineTimestamp)),
    Q.where('date', day),
    Q.sortBy('created_at', 'asc'))
  const practices = query.data

  if (!practices.length) return { data: { practices: [], practiceDuration: 0 } }

  const practiceDuration = Math.round(practices.reduce(
    (total, practice) => total + (practice.duration_seconds || 0),
    0
  ))

  return { data: { practices, practiceDuration } }
}
