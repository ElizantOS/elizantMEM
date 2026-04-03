export type BaselineVariant =
  | 'no_memory'
  | 'passive_vector_memory'
  | 'rule_based_typed_memory'
  | 'bandit_memory_manager'
  | 'policy_split_memory'

export const baselineVariants: BaselineVariant[] = [
  'no_memory',
  'passive_vector_memory',
  'rule_based_typed_memory',
  'bandit_memory_manager',
  'policy_split_memory',
]
