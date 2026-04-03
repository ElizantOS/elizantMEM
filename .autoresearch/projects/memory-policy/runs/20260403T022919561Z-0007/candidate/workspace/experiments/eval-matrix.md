# Evaluation Matrix

| Dimension | Metric | Operational definition | Why it matters | Expected direction |
| --- | --- | --- | --- | --- |
| Write quality | Write precision | Share of written memories that produce at least one future helpful retrieval within the evaluation window | Whether stored memories help future tasks | Up |
| Write quality | Redundancy rate | Share of writes that duplicate an already sufficient memory unit | Whether the store is bloated with duplicates | Down |
| Store health | Pollution rate | Share of retrieved memories later marked harmful, distracting, or scope-violating | Whether memories mislead the agent | Down |
| Store health | Stale rate | Share of retrieved memories whose source facts were outdated at retrieval time | Whether outdated memories are still being retrieved | Down |
| Retrieval quality | Retrieval hit rate | Share of tasks where at least one relevant memory was surfaced when relevant memory existed | Whether relevant memories are surfaced | Up |
| Retrieval quality | Useful retrieval rate | Share of retrieval events where injected memory was referenced and improved downstream execution | Whether surfaced memories actually help | Up |
| Retrieval cost | Over-retrieval rate | Share of retrieval events where no injected memory was referenced or useful | Whether retrieval is invoked unnecessarily | Down |
| Task outcome | Task success lift | Delta in fully successful task completion relative to the baseline | End-to-end business value | Up |
| Task outcome | SQL success lift | Delta in correct SQL execution or answer grounding relative to the baseline | Analytical correctness proxy | Up |
| Efficiency | Retry reduction | Relative drop in repair or retry turns per task | Reduced wasted iterations | Up |
| Efficiency | Token reduction | Relative drop in prompt plus completion tokens per successful task | Lower context cost | Up |
| Efficiency | Latency reduction | Relative drop in end-to-end wall-clock time per successful task | Faster answer delivery | Up |

## Required Slices

Every primary metric should be reported for:

- preference memory tasks
- schema memory tasks
- business-rule update tasks
- failure-recovery tasks
- short-horizon tasks versus long-horizon tasks
- offline replay versus online rollout

## Decision Attribution

The readout must preserve separate columns for:

- write-policy variant
- retrieval-policy variant
- ledger reward variant
- store variant

This prevents "memory system improved" claims that cannot identify whether the gain came from write quality, retrieval quality, or a store-side confound.

## Readout Table

For every experiment slice, record:

- scenario
- baseline
- write policy variant
- retrieval policy variant
- ledger reward variant
- metric deltas
- observed failure modes
- follow-up hypothesis
