# Experiment Plan

## Hypothesis

Agents with policy-controlled long-term memory outperform passive memory stores because they learn what to write, what to retrieve, and what to retire.

Primary iteration hypothesis for this workspace: separating write-policy learning from retrieval-policy learning will improve falsifiability and implementation clarity versus a single blended memory-manager score.

## Baselines

1. no long-term memory
2. passive vector memory with naive top-k retrieval
3. rule-based typed memory without learning
4. bandit-managed write and retrieval policy
5. joint-memory-policy model with one shared action score for write and retrieval

## Experimental Factors

- write policy: rules, contextual bandit, RL fine-tuning
- retrieval policy: rules, contextual bandit, RL fine-tuning
- store structure: single vector store versus typed episodic/semantic/procedural store
- ledger fidelity: full reward decomposition versus task-outcome-only reward
- freshness controls: no ttl, fixed ttl, adaptive ttl

## Offline Evaluation

- replay historical traces through a simulator
- score retrieval usefulness and write value using future-window outcomes
- measure write precision, memory utility rate, pollution rate, stale rate, and redundancy rate

Offline protocol:

1. Build a replay dataset of multi-turn data-analysis tasks with event logs, SQL traces, retries, and final outcomes.
2. Freeze the underlying task executor so only memory decisions vary across runs.
3. For each trace, materialize the candidate memory set available at decision time.
4. Evaluate counterfactual write decisions against a future window of tasks from the same tenant or domain.
5. Evaluate counterfactual retrieval decisions by replaying execution with and without injected memories.

Offline slices:

- preference-heavy tasks
- schema-navigation tasks
- repeated-query-pattern tasks
- business-rule-update tasks
- failure-recovery tasks

## Online Evaluation

- run task batches over analysis questions that require preferences, schema knowledge, and error recovery
- compare task success, SQL success, retries, token cost, and latency

Online protocol:

1. Randomize tasks across baseline and policy variants at the session or task level.
2. Hold tool access, model, and prompt constant across variants.
3. Record write decisions and retrieval decisions separately in the ledger.
4. Gate rollout by harmful-context rate and privacy-scope violations before expanding traffic.

## Ablations

- remove memory scorer
- disable retrieval policy learning
- disable feedback ledger features
- collapse typed memory into a single store
- vary top-k and ttl policy
- disable write policy learning while keeping retrieval learning
- disable retrieval learning while keeping write learning
- replace decomposed reward with single success-only reward
- remove stale-memory penalties from the write reward

## Success Criteria

- write policy beats passive storage on write precision and pollution rate
- retrieval policy beats naive top-k on useful retrieval rate and over-retrieval rate
- combined policy yields positive task success lift and SQL success lift
- combined policy reduces tokens and latency without increasing harmful-context events

## Risks

- reward delay can misattribute value
- noisy user feedback can contaminate the ledger
- stale business rules can look helpful in the short term
- offline replay may overestimate gains if future tasks are too similar to training traces
- joint optimization may let retrieval policy hide write-policy failures

## Rollout

- stage A: observability and rules
- stage B: contextual bandit online
- stage C: full RL with replay and safeguarded deployment

## Implementation Hand-off Requirements

Before coding begins, the experiment harness should define:

- one canonical ledger row format shared by offline and online evaluation
- one replay dataset schema with train, validation, and holdout splits
- one policy registry that can swap write and retrieval policies independently
- one dashboard view that reports product metrics beside store-health metrics
