import { Subscription } from 'rxjs'
import { Q } from '@nozbe/watermelondb'

import { type SyncEffect } from '.'

import { type ModelClass } from '../index'

// notifies a subscriber that unsynced records exist
// ideally used by a logout interrupt prompt to tell the user that logging out
// now would make them lose data

// we notify eagerly so that the prompt can be shown as soon as user clicks logout,
// instead of waiting for a lazy query at that moment

const createLogoutWarningEffect = (notifyCallback: (unsyncedModels: ModelClass[]) => void) => {
  const logoutWarning: SyncEffect = function (context, stores) {
    const unsyncedModels = new Set<ModelClass>()
    const subscriptions: Subscription[] = []

    const notifyFromAll = () => {
      notifyCallback(Array.from(unsyncedModels))
    }

    stores.forEach((store) => {
      const sub = store.collection
        .query(Q.where('_status', Q.notEq('synced')), Q.take(1)) // todo - doesn't consider deleted records ??
        .observe()
        .subscribe((records) => {
          if (records.length > 0) {
            unsyncedModels.add(store.model)
          } else {
            unsyncedModels.delete(store.model)
          }
          notifyFromAll()
        })
      subscriptions.push(sub)
    })

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe())
    }
  }

  return logoutWarning
}

export default createLogoutWarningEffect
