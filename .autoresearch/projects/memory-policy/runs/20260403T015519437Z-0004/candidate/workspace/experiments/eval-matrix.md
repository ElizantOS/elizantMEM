# Evaluation Matrix

| Dimension | Metric | Why it matters | Expected direction |
| --- | --- | --- | --- |
| Write quality | Write precision | Whether stored memories help future tasks | Up |
| Write quality | Redundancy rate | Whether the store is bloated with duplicates | Down |
| Store health | Pollution rate | Whether memories mislead the agent | Down |
| Store health | Stale rate | Whether outdated memories are still being retrieved | Down |
| Retrieval quality | Retrieval hit rate | Whether relevant memories are surfaced | Up |
| Retrieval quality | Useful retrieval rate | Whether surfaced memories actually help | Up |
| Retrieval cost | Over-retrieval rate | Whether retrieval is invoked unnecessarily | Down |
| Task outcome | Task success lift | End-to-end business value | Up |
| Task outcome | SQL success lift | Analytical correctness proxy | Up |
| Efficiency | Retry reduction | Reduced wasted iterations | Up |
| Efficiency | Token reduction | Lower context cost | Up |
| Efficiency | Latency reduction | Faster answer delivery | Up |

## Readout Table

For every experiment slice, record:

- scenario
- baseline
- policy variant
- metric deltas
- observed failure modes
- follow-up hypothesis
