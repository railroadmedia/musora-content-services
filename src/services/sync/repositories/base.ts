import SyncStore from "../store";
import { Model, Q } from "@nozbe/watermelondb";

export default class SyncRepository<T extends Model> {
  constructor(
    protected store: SyncStore<T>
  ) {}

  async upsert(id: string, builder: (record: T) => void) {
    await this.store.db.write(async () => {
      const existing = await this.store.collection.query(Q.where('id', id)).fetch().then(records => records[0]);

      if (existing) {
        existing.update(builder);
      } else {
        this.store.collection.create(record => {
          record._raw.id = id;
          builder(record)
        });
      }
    })

    return this.store.readOne(id)
  }

  //create upsert object?
}
