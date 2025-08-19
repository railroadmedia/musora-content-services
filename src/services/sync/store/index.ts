import { Database, type Collection, type Model } from '@nozbe/watermelondb'

export default class SyncStore<T extends Model> {
  db: Database
  model: T
  collection: Collection<T>

  constructor(model: T, db: Database) {
    this.db = db
    this.model = model
    this.collection = db.collections.get(model.table)
  }

  async sync() {
    console.log(await this.collection.query().fetch())

    // await this.db.write(writer => {
    //   const records = [{ user_id: '1', content_id: '1' }].map(data =>
    //     this.collection.prepareCreate(record => record)
    //   )

    //   return writer.batch(...records)
    // }, 'do some stuff')
  }
}
