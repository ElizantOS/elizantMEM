# Experiment Bootstrap

This lane holds executable experiment scaffolds that the main autoresearch loop can implement and refine.

Expected components:

- `contracts/trace-schema.ts`
- `contracts/ledger-schema.ts`
- `replay/replay-harness.ts`
- `baselines/registry.ts`
- `evaluation/metrics.ts`

Execution contract:

- `trace` captures replayable request, read, write, answer, and feedback events
- `ledger` attributes whether a memory helped or harmed a downstream trace
- `replay` runs write policy and retrieval policy as separate evaluation slices
- `baseline` names the comparison variants for rules, bandits, and policy-split systems
- `evaluation` computes policy metrics without collapsing write and retrieval into one score
