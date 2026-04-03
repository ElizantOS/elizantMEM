# Results Readout

## Summary

- baseline: passive vector memory with naive top-k retrieval
- best variant: pending
- overall delta: pending
- release gate: do not advance a learned variant unless it clears both outcome and store-health gates

## Experiment Table

| Scenario | Baseline | Variant | Delta | Failure Modes | Next Hypothesis |
| --- | --- | --- | --- | --- | --- |
| Offline trace replay | Passive vector memory | Policy-managed memory | Pending | Reward delay may blur attribution | tighten replay labeling and ledger schema |
| Online analysis tasks | Rule-based typed memory | Bandit-managed memory | Pending | retrieval overuse may inflate token cost | tune retrieve-or-skip policy and top-k |

## Required Per-Run Readout

- baseline: exact comparator used for the slice
- variant: exact write/retrieval policy configuration
- delta: report task, SQL, token, latency, write precision, and useful retrieval deltas together
- failure modes: separate write failures from retrieval failures
- next hypothesis: name the single mechanism to change next
