# Results Readout

## Summary

- baseline: passive vector memory with naive top-k retrieval
- best variant: pending
- overall delta: pending

## Experiment Table

| Scenario | Baseline | Variant | Delta | Failure Modes | Next Hypothesis |
| --- | --- | --- | --- | --- | --- |
| Offline trace replay | Passive vector memory | Policy-managed memory | Pending | Reward delay may blur attribution | tighten replay labeling and ledger schema |
| Online analysis tasks | Rule-based typed memory | Bandit-managed memory | Pending | retrieval overuse may inflate token cost | tune retrieve-or-skip policy and top-k |
