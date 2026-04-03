export type TraceEvent = {
  traceId: string
  tenantId: string
  taskType: string
  eventType: 'request' | 'memory_read' | 'memory_write' | 'tool' | 'sql' | 'answer' | 'feedback'
  timestamp: string
  payload: Record<string, unknown>
}

export type TraceRecord = {
  traceId: string
  startedAt: string
  finishedAt?: string
  events: TraceEvent[]
}
