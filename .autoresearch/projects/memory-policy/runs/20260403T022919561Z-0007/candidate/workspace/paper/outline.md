# Paper Outline

## 1. Problem

- existing agent memory systems over-index on storage and recall
- long-term value depends on write decisions, retrieval decisions, and lifecycle control
- passive vector stores accumulate pollution, redundancy, and stale state

## 2. Core Thesis

- memory is a decision policy
- memory is a product surface that changes agent behavior
- memory is a feedback loop with future-task utility as the governing signal

## 3. System

- event capture
- candidate generator
- memory scorer
- write policy
- typed memory store
- retrieval policy
- execution contextualizer
- feedback ledger and credit assignment

## 4. Learning Roadmap

- stage A: rules plus observability
- stage B: contextual bandit for write and retrieval decisions
- stage C: multi-step RL over full agent trajectories

## 5. Experiments

- offline replay evaluation over trace datasets
- online task evaluation in Metabase-style analysis tasks
- ablations on write policy, retrieval policy, and ledger quality

## 6. Results To Target

- task success lift
- SQL success lift
- retry reduction
- token and latency reduction
- lower pollution and stale retrieval rates

## 7. Limitations

- feedback is delayed and noisy
- memory usefulness is task-dependent
- online policies require careful safety and privacy constraints
