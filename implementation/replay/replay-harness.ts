import type { TraceRecord } from '../contracts/trace-schema'

export type ReplayBatch = {
  traces: TraceRecord[]
}

export function replayBatch(batch: ReplayBatch): number {
  return batch.traces.length
}
