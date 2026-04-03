# Experiment Plan

## Hypothesis

Agents with policy-controlled long-term memory outperform passive memory stores because they learn what to write, what to retrieve, and what to retire.

Primary falsifiable claim:

- under a fixed context and storage budget, separate write and retrieval policies will increase task success and SQL success while reducing pollution, stale retrievals, and token cost relative to passive memory

## Baselines

1. no long-term memory
2. passive vector memory with naive top-k retrieval
3. rule-based typed memory without learning
4. bandit-managed write and retrieval policy
5. oracle replay upper bound using hindsight-selected writes and retrievals

## Offline Evaluation

- replay historical traces through a simulator
- score retrieval usefulness and write value using future-window outcomes
- measure write precision, memory utility rate, pollution rate, stale rate, and redundancy rate
- replay traces at fixed budgets so token reduction and latency reduction stay comparable across variants
- label future-window outcomes with decision ids so write actions and retrieval actions can be evaluated separately

### Offline Datasets

- schema-lookup tasks where durable schema memory should help
- preference-following tasks where user-specific memory matters
- repeated query-pattern tasks where procedural memory should reduce retries
- stale-business-rule tasks where bad memory should be penalized quickly

### Offline Acceptance Gates

- write precision improves over passive memory by at least 10 percent relative
- pollution rate does not regress by more than 1 percentage point
- stale rate improves over passive memory by at least 15 percent relative
- token reduction remains non-negative versus the passive baseline

## Online Evaluation

- run task batches over analysis questions that require preferences, schema knowledge, and error recovery
- compare task success, SQL success, retries, token cost, and latency
- randomize tasks across tenants and domains to test scope handling rather than memorizing a single environment
- log whether retrieved memories were merely injected or actually used in the final successful trace

### Online Success Criteria

- task success lift is positive with confidence intervals excluding zero
- sql success lift is positive on tasks requiring remembered schema or query idioms
- latency reduction and token reduction remain non-negative after retrieval cost is included
- no privacy or scope-violation incidents are observed in the evaluation window

## Ablations

- remove memory scorer
- disable retrieval policy learning
- disable feedback ledger features
- collapse typed memory into a single store
- vary top-k and ttl policy
- freeze write policy while learning retrieval policy
- freeze retrieval policy while learning write policy
- remove lifecycle retirement and stale suppression

## Decision-Level Metrics

- write policy: precision, recall-on-useful-memories, duplicate rate, pollution rate
- retrieval policy: retrieval hit rate, useful retrieval rate, over-retrieval rate, stale retrieval rate
- end-to-end: task success lift, sql success lift, retry reduction, token reduction, latency reduction

## Risks

- reward delay can misattribute value
- noisy user feedback can contaminate the ledger
- stale business rules can look helpful in the short term
- offline labels may reward memories that correlate with success without causing success

## Rollout

- stage A: observability and rules
- stage B: contextual bandit online
- stage C: full RL with replay and safeguarded deployment

### Rollout Safeguards

- launch write policy learning before retrieval policy learning to avoid compounding errors
- require offline acceptance before any online rollout
- keep a rule-only fallback and compare every online variant against the same traffic slice
- stop rollout if pollution rate, stale rate, or privacy incidents regress beyond threshold
