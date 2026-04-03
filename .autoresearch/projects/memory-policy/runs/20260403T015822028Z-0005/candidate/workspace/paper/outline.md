# Paper Outline

## 1. Problem

- existing agent memory systems over-index on storage and recall
- long-term value depends on write decisions, retrieval decisions, and lifecycle control
- passive vector stores accumulate pollution, redundancy, and stale state
- data-analysis assistants face repeated schemas, preferences, query idioms, and failure recovery patterns that make memory valuable but also risky

## 2. Core Thesis

- memory is a decision policy
- memory is a product surface that changes agent behavior
- memory is a feedback loop with future-task utility as the governing signal
- write policy and retrieval policy must remain analytically distinct because they optimize different actions, costs, and failure modes

## 3. Setting And Memory Unit

- agent setting: data-analysis assistant with tool use, SQL generation, retries, and user follow-up
- typed memory unit: identity, type, content, provenance, scope, confidence, ttl, lifecycle stats
- memory classes: preference, schema fact, query pattern, business rule, exception case, procedural skill

## 4. System Loop

- event capture
- candidate generator
- memory scorer
- write policy
- typed memory store
- retrieval policy
- execution contextualizer
- feedback ledger and credit assignment

## 5. Policy Formulation

- write policy action space: skip, write, merge, replace, ttl-short, ttl-long
- retrieval policy action space: skip retrieval, retrieve by type, retrieve by top-k budget, compress before inject
- reward sources: task success, SQL success, retry reduction, token reduction, latency reduction, pollution penalties
- delayed credit assignment: evaluate a memory by downstream future-window utility rather than immediate salience

## 6. Learning Roadmap

- stage A: rules plus observability
- stage B: contextual bandit for write and retrieval decisions
- stage C: multi-step RL over full agent trajectories

## 7. Experiments

- offline replay evaluation over trace datasets
- online task evaluation in Metabase-style analysis tasks
- ablations on write policy, retrieval policy, and ledger quality
- baselines spanning no memory, passive memory, typed-rule memory, and learned policies
- explicit failure analysis for stale memories, over-retrieval, redundant writes, and privacy/scope violations

## 8. Results To Target

- task success lift
- SQL success lift
- retry reduction
- token and latency reduction
- lower pollution and stale retrieval rates
- improved write precision and useful retrieval rate under bounded memory budget

## 9. Limitations And Open Questions

- feedback is delayed and noisy
- memory usefulness is task-dependent
- online policies require careful safety and privacy constraints
- reward proxies may overvalue short-term productivity over long-horizon correctness
- memory policies may need tenant-specific calibration and conservative rollout gates
