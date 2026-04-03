export type ExperimentMetric =
  | 'write_precision'
  | 'pollution_rate'
  | 'stale_rate'
  | 'task_success_lift'
  | 'sql_success_lift'
  | 'token_reduction'
  | 'latency_reduction'

export function supportedMetrics(): ExperimentMetric[] {
  return [
    'write_precision',
    'pollution_rate',
    'stale_rate',
    'task_success_lift',
    'sql_success_lift',
    'token_reduction',
    'latency_reduction',
  ]
}
