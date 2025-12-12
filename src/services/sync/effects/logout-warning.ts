import { Subscription } from 'rxjs'
import { Q } from '@nozbe/watermelondb'

import { type SyncEffect } from '.'
import type SyncStore from '../store'

// notifies a subscriber that unsynced records exist
// ideally used by a logout interrupt prompt to tell the user that logging out
// now would make them lose data

// we notify eagerly so that the prompt can be shown as soon as user clicks logout,
// instead of waiting for a lazy query at that moment

const createLogoutWarningEffect = (notifyCallback: (fullySynced: boolean) => void) => {
  const logoutWarning: SyncEffect = function (context, stores) {
    const recordCounts = new Map<SyncStore, number>()
    const subscriptions: Subscription[] = []

    stores.forEach((store) => {
      recordCounts.set(store, 0)
      const sub = store.collection
        .query(Q.where('_status', Q.notEq('synced')), Q.take(1)) // todo - doesn't consider deleted records ??
        .observe()
        .subscribe((records) => {
          recordCounts.set(store, records.length)
          notifyFromAll()
        })
      subscriptions.push(sub)
    })

    const notifyFromAll = () => {
      notifyCallback(Array.from(recordCounts.values()).reduce((a, b) => a + b, 0) === 0)
    }

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe())
    }
  }

  return logoutWarning
}

export default createLogoutWarningEffect
