export type MemoryLedgerRow = {
  memoryId: string
  traceId: string
  retrieved: boolean
  injected: boolean
  referenced: boolean
  helped: boolean
  harmed: boolean
  taskSuccess?: boolean
  sqlSuccess?: boolean
  deltaToken?: number
  deltaLatencyMs?: number
}
