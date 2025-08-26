import { DatabaseAdapter } from "@nozbe/watermelondb";
import SyncStoreOrchestrator from "./orchestrator";

// teardown (ideally occurring on logout) should:
// 1. stop all sync strategies
// 2. cancel any scheduled fetch requests that came from those sync strategies
// 3. reset local databases
// 4. purge any databases that are no longer referenced in schema (possible if user logs out after a schema change)

export default function syncSetup({ adapter, orchestrator }: { adapter: DatabaseAdapter, orchestrator: SyncStoreOrchestrator }) {
  orchestrator.start()

  return () => {
    orchestrator.stop()
  }
}
