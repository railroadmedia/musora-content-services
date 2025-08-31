import { type SyncContext } from "./index";

// teardown (ideally occurring on logout) should:
// 1. stop all sync strategies
// 2. cancel any scheduled fetch requests that came from those sync strategies (handled by orchestrator abort controller)
// 3. reset local databases
// 4. purge any databases that are no longer referenced in schema (possible if user logs out after a schema change)?

export default function syncSetup({ session, orchestrator, databases }: SyncContext) {
  orchestrator.start()

  return async () => {
    orchestrator.stop()
    session.abort()
    await Promise.all(databases.map(db => db.write(() => db.unsafeResetDatabase())))

    // TODO - purge entire adapter?
    // no functionality built-in - would have to extend adapter
  }
}
