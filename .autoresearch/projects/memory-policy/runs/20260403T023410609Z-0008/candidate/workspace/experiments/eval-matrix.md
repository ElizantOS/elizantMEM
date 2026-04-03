# Evaluation Matrix

| Dimension | Metric | Definition | Evidence source | Why it matters | Expected direction |
| --- | --- | --- | --- | --- | --- |
| Write quality | Write precision | Fraction of written memories that help at least one later matched task within the replay window | Offline replay plus ledger joins | Whether stored memories help future tasks | Up |
| Write quality | Redundancy rate | Fraction of writes whose content duplicates an existing memory above the merge threshold | Store audit | Whether the store is bloated with duplicates | Down |
| Store health | Pollution rate | Fraction of retrieved memories that measurably worsen planning, tool use, or answer quality | Offline counterfactual plus online failure labels | Whether memories mislead the agent | Down |
| Store health | Stale rate | Fraction of injected memories whose source fact or rule is outdated at retrieval time | Temporal-update task slice | Whether outdated memories are still being retrieved | Down |
| Retrieval quality | Retrieval hit rate | Fraction of tasks where at least one relevant memory is surfaced when relevant memory exists | Replay oracle comparison | Whether relevant memories are surfaced | Up |
| Retrieval quality | Useful retrieval rate | Fraction of retrievals that improve downstream behavior, not just semantic similarity | Replay plus online instrumentation | Whether surfaced memories actually help | Up |
| Retrieval cost | Over-retrieval rate | Fraction of retrieval events where injected memory is unused or net harmful | Contextualizer plus ledger labels | Whether retrieval is invoked unnecessarily | Down |
| Task outcome | Task success lift | Delta in completed analysis tasks versus baseline | Online evaluation | End-to-end business value | Up |
| Task outcome | SQL success lift | Delta in correct SQL executions versus baseline | Online evaluation | Analytical correctness proxy | Up |
| Efficiency | Retry reduction | Relative drop in retries or recovery loops per task | Trace metrics | Reduced wasted iterations | Up |
| Efficiency | Token reduction | Relative drop in prompt and completion tokens per successful task | Runtime metrics | Lower context cost | Up |
| Efficiency | Latency reduction | Relative drop in wall-clock latency per successful task | Runtime metrics | Faster answer delivery | Up |

## Slice Coverage

Every primary metric should be segmented by:

- schema grounding
- user preference carryover
- temporal update handling
- error recovery
- reusable workflow patterns

## Attribution Rules

- write policy is accountable for write precision, redundancy rate, and downstream stale harm from admitted memories
- retrieval policy is accountable for useful retrieval rate, over-retrieval rate, and task regressions caused by injection
- the shared ledger is accountable for whether delayed outcomes can be joined back to the responsible write and retrieval decisions

## Readout Table

For every experiment slice, record:

- scenario
- baseline
- policy variant
- metric deltas
- observed failure modes
- follow-up hypothesis
