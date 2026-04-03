# Evaluation Matrix

| Dimension | Metric | Operational definition | Why it matters | Expected direction |
| --- | --- | --- | --- | --- |
| Write quality | Write precision | Fraction of written memories that are later labeled helpful within the future window | Whether stored memories help future tasks | Up |
| Write quality | Redundancy rate | Fraction of writes that substantially duplicate an existing memory in the same scope | Whether the store is bloated with duplicates | Down |
| Store health | Pollution rate | Fraction of stored memories later marked harmful, misleading, or irrelevant | Whether memories mislead the agent | Down |
| Store health | Stale rate | Fraction of retrieved memories whose facts or procedures are outdated at retrieval time | Whether outdated memories are still being retrieved | Down |
| Retrieval quality | Retrieval hit rate | Fraction of tasks with at least one relevant memory retrieved when a useful memory exists | Whether relevant memories are surfaced | Up |
| Retrieval quality | Useful retrieval rate | Fraction of retrieved memories that are actually used and improve the final trajectory | Whether surfaced memories actually help | Up |
| Retrieval cost | Over-retrieval rate | Fraction of retrieval events where retrieval occurred but no retrieved memory was used | Whether retrieval is invoked unnecessarily | Down |
| Task outcome | Task success lift | Relative improvement in task completion versus the chosen baseline | End-to-end business value | Up |
| Task outcome | SQL success lift | Relative improvement in correct executable SQL versus baseline | Analytical correctness proxy | Up |
| Efficiency | Retry reduction | Relative decrease in retries per task versus baseline | Reduced wasted iterations | Up |
| Efficiency | Token reduction | Relative decrease in total tokens per completed task versus baseline | Lower context cost | Up |
| Efficiency | Latency reduction | Relative decrease in end-to-end latency per completed task versus baseline | Faster answer delivery | Up |

## Metric Owners

| Metric family | Primary policy owner | Secondary contributors |
| --- | --- | --- |
| Write precision, redundancy rate, pollution rate | Write policy | Candidate generator, memory scorer |
| Retrieval hit rate, useful retrieval rate, over-retrieval rate, stale rate | Retrieval policy | Memory store, execution contextualizer |
| Task success lift, SQL success lift, retry reduction | Joint | Feedback ledger, execution system |
| Token reduction, latency reduction | Retrieval policy | Execution contextualizer, write policy |

## Evaluation Slices

- by memory type: preference, schema fact, query pattern, business rule, exception case, procedural skill
- by task type: schema lookup, dashboard explanation, SQL repair, preference following, repeated workflow
- by time horizon: same-session reuse, next-session reuse, long-horizon reuse
- by tenant scope: single tenant, multi-tenant, privacy-sensitive slices

## Readout Table

For every experiment slice, record:

- scenario
- baseline
- policy variant
- memory budget and retrieval budget
- metric deltas
- observed failure modes
- follow-up hypothesis

## Failure Thresholds

- reject a policy variant if pollution rate worsens by more than 1 percentage point versus baseline
- reject a policy variant if stale rate worsens by more than 2 percentage points on long-horizon slices
- reject a policy variant if token reduction is negative while task success lift is statistically indistinguishable from zero
- reject a policy variant immediately on any privacy or tenant-scope violation
