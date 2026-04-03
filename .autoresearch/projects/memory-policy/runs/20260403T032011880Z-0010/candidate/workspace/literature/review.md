# Literature Review

## Why This Stage Exists

This project should not define write/retrieval rewards or dashboard metrics from intuition alone. It needs a grounding pass over the closest agent-memory papers and benchmarks so the later design and experiment artifacts inherit real evaluation practice.

## Closest System Papers

- `MemGPT` (2023):
  contribution: hierarchical, OS-inspired memory management for stateful agents.
  relevance: strong baseline for layered memory and memory paging, but mostly heuristic rather than RL-driven.
  implication for us: use it as the architecture baseline, not as the end-state policy learner.

- `Memory-R1` (arXiv:2508.19828, August 27, 2025):
  contribution: reinforcement-learning framework for adaptive memory management and retrieval in LLM agents.
  relevance: directly supports the idea that memory operations can be learned rather than fixed by heuristics.
  implication for us: include learned write/update/retrieve actions in the design space and treat memory management as a policy problem.

- `Mem-α` (arXiv:2509.25911, September 30, 2025):
  contribution: RL for memory construction in more complex memory systems.
  relevance: pushes beyond simple store-or-not-store heuristics into structured memory construction.
  implication for us: reward design should account for memory structure quality, not just downstream answer quality.

- `AgeMem` (arXiv:2601.01885, January 5, 2026):
  contribution: unified management of long-term and short-term memory as part of the agent policy.
  relevance: closest match to the claim that memory should be inside the policy rather than attached beside it.
  implication for us: keep write, update, forget, and retrieve under one control view even if implementation starts with separate modules.

- `MemRL` (arXiv:2601.03192, January 6, 2026):
  contribution: runtime reinforcement learning over episodic memory with utility-aware retrieval.
  relevance: aligns with utility-weighted retrieval and feedback-ledger ideas.
  implication for us: retrieval metrics should distinguish semantic relevance from learned utility.

- `AtomMem` (arXiv:2601.08323, January 13, 2026):
  contribution: decomposes memory management into atomic CRUD-style operations.
  relevance: useful for turning high-level memory workflows into a concrete action space.
  implication for us: action spaces for write policy and retrieval policy should be explicit and auditable.

## Closest Benchmarks

- `LoCoMo` (arXiv:2402.17753, February 27, 2024):
  focus: very long-term conversational memory over temporally grounded dialogues.
  implication for us: temporal consistency, persona persistence, and event tracking matter when evaluating memory quality.

- `LongMemEval` (arXiv:2410.10813, October 14, 2024):
  focus: five long-term memory abilities for chat assistants, including information extraction, multi-session reasoning, temporal reasoning, knowledge updates, and abstention.
  implication for us: our experiment suite should separate storage quality from recall quality and from safe abstention under uncertainty.

## Research Gap For This Project

The literature increasingly treats memory management as a control problem, but there is still room for a production-oriented system that:

- separates write policy and retrieval policy while keeping them credit-linked
- tracks a lifecycle ledger with helpful/harmful outcomes
- evaluates both usefulness and pollution
- exposes product metrics such as token cost, latency, retries, and stale-memory harm

## Immediate Metric Consequences

- Keep `write precision`, `pollution rate`, `stale rate`, and `useful retrieval rate` as first-class metrics.
- Add benchmark-informed categories such as temporal reasoning, knowledge updates, and abstention.
- Treat `task success lift`, `token reduction`, and `latency reduction` as product-facing complements, not substitutes for benchmark metrics.
