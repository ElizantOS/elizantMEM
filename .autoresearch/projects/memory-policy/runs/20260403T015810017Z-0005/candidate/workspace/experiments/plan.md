# Experiment Plan

## Hypothesis

Agents with policy-controlled long-term memory outperform passive memory stores because they learn what to write, what to retrieve, and what to retire.

## Baselines

1. no long-term memory
2. passive vector memory with naive top-k retrieval
3. rule-based typed memory without learning
4. bandit-managed write and retrieval policy

## Offline Evaluation

- replay historical traces through a simulator
- score retrieval usefulness and write value using future-window outcomes
- measure write precision, memory utility rate, pollution rate, stale rate, and redundancy rate

## Online Evaluation

- run task batches over analysis questions that require preferences, schema knowledge, and error recovery
- compare task success, SQL success, retries, token cost, and latency

## Ablations

- remove memory scorer
- disable retrieval policy learning
- disable feedback ledger features
- collapse typed memory into a single store
- vary top-k and ttl policy

## Risks

- reward delay can misattribute value
- noisy user feedback can contaminate the ledger
- stale business rules can look helpful in the short term

## Rollout

- stage A: observability and rules
- stage B: contextual bandit online
- stage C: full RL with replay and safeguarded deployment
