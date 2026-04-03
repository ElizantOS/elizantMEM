import type { BaselineVariant } from '../baselines/registry'
import type { TraceRecord } from '../contracts/trace-schema'
import type { ExperimentMetric } from '../evaluation/metrics'

export type ReplaySlice = 'write_policy' | 'retrieval_policy'

export type ReplayExample = {
  trace: TraceRecord
  expectedMemoryIds: string[]
  expectedWriteDecision?: 'write' | 'skip'
  retrievalK?: number
}

export type ReplayBatch = {
  runId: string
  seed: number
  slice: ReplaySlice
  baseline: BaselineVariant
  metrics: ExperimentMetric[]
  traces: ReplayExample[]
}

export type ReplayPlan = {
  replayedTraces: number
  evaluatedSlice: ReplaySlice
  baseline: BaselineVariant
  metricCount: number
}

export function replayBatch(batch: ReplayBatch): ReplayPlan {
  return {
    replayedTraces: batch.traces.length,
    evaluatedSlice: batch.slice,
    baseline: batch.baseline,
    metricCount: batch.metrics.length,
  }
}
