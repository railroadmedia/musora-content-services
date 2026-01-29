import { type SyncEffect } from '.'

const NOTIFICATION_COOLDOWN = 60_000 * 10 // 10 mins
const MUTE_PERIOD = 60_000 * 60 * 3 // 3 hours

const createPushFailureNotificationEffect = (notifyCallback: (opts: { mute: () => void }) => void) => {
  let lastNotifiedAt = 0
  let mutedUntil = 0

  const mute = () => {
    mutedUntil = Date.now() + MUTE_PERIOD
  }

  const pushFailureToast: SyncEffect = function (_context, stores) {
    const maybeNotify = () => {
      const now = Date.now()
      if (now - lastNotifiedAt < NOTIFICATION_COOLDOWN) return
      if (mutedUntil && now < mutedUntil) return

      lastNotifiedAt = now
      notifyCallback({ mute })
    }

    const teardowns = stores.map((store) => store.on('failedPush', maybeNotify))

    return () => {
      teardowns.forEach((teardown) => teardown())
    }
  }

  return pushFailureToast
}

export default createPushFailureNotificationEffect
