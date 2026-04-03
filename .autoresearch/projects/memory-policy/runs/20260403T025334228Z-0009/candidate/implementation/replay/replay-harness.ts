import type { TraceRecord } from '../contracts/trace-schema'
import type { MemoryLedgerRow } from '../contracts/ledger-schema'
import type { BaselineVariant } from '../baselines/registry'
import type { ExperimentMetric } from '../evaluation/metrics'

export type ReplaySlice = 'write_policy' | 'retrieval_policy'

export type ReplayBatch = {
  variant: BaselineVariant
  slice: ReplaySlice
  traces: TraceRecord[]
  ledgerRows: MemoryLedgerRow[]
}

export type ReplaySummary = {
  variant: BaselineVariant
  slice: ReplaySlice
  traceCount: number
  ledgerRowCount: number
  decisionEvents: number
  outcomeEvents: number
  supportedMetrics: ExperimentMetric[]
}

function countDecisionEvents(trace: TraceRecord, slice: ReplaySlice): number {
  return trace.events.filter((event) => {
    if (slice === 'write_policy') {
      return event.eventType === 'memory_write'
    }

    return event.eventType === 'memory_read'
  }).length
}

function countOutcomeEvents(trace: TraceRecord): number {
  return trace.events.filter((event) => {
    return event.eventType === 'answer' || event.eventType === 'feedback'
  }).length
}

export function replayBatch(batch: ReplayBatch): ReplaySummary {
  const decisionEvents = batch.traces.reduce((total, trace) => {
    return total + countDecisionEvents(trace, batch.slice)
  }, 0)

  const outcomeEvents = batch.traces.reduce((total, trace) => {
    return total + countOutcomeEvents(trace)
  }, 0)

  const supportedMetrics: ExperimentMetric[] =
    batch.slice === 'write_policy'
      ? ['write_precision', 'pollution_rate', 'stale_rate']
      : ['task_success_lift', 'sql_success_lift', 'token_reduction', 'latency_reduction']

  return {
    variant: batch.variant,
    slice: batch.slice,
    traceCount: batch.traces.length,
    ledgerRowCount: batch.ledgerRows.length,
    decisionEvents,
    outcomeEvents,
    supportedMetrics,
  }
}
