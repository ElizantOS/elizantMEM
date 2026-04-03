# Experiment Plan

## Hypothesis

Agents with policy-controlled long-term memory outperform passive memory stores when write policy and retrieval policy are optimized separately but linked by a shared feedback ledger.

## Falsifiable Questions

1. Does explicit write policy improve future write precision and reduce pollution relative to passive logging?
2. Does explicit retrieval policy improve useful retrieval rate and reduce over-retrieval relative to naive top-k retrieval?
3. Does the coupled ledger improve end-task outcomes beyond optimizing write or retrieval alone?

## Baselines

1. no long-term memory
2. passive vector memory with naive top-k retrieval
3. rule-based typed memory without learning
4. bandit-managed write and retrieval policy
5. write-policy-only learner with heuristic retrieval
6. retrieval-policy-only learner with passive writes

## Task Slices

- schema grounding: repeated table/metric lookup across sessions
- user preference carryover: formatting and explanation preferences
- temporal update handling: business rules that change over time
- error recovery: reuse of prior fixes after failed SQL/tool attempts
- reusable workflow patterns: recurring analysis plans and query templates

## Offline Evaluation

- replay historical traces through a simulator
- score retrieval usefulness and write value using future-window outcomes
- measure write precision, memory utility rate, pollution rate, stale rate, and redundancy rate
- label each replay example with task slice, memory type, and whether the memory changed planning, tool calls, or final answers
- run counterfactual replay for `no-retrieval`, `oracle retrieval`, and `stale retrieval injected`
- primary offline gate: learned variants must beat rule-based typed memory on write precision and useful retrieval rate without worsening pollution rate

## Online Evaluation

- run task batches over analysis questions that require preferences, schema knowledge, and error recovery
- compare task success, SQL success, retries, token cost, and latency
- randomize tasks by slice so temporal updates and schema reuse are not drowned out by easy tasks
- evaluate abstention separately: a policy that skips bad retrieval should not be penalized like a wrong retrieval

## Ablations

- remove memory scorer
- disable retrieval policy learning
- disable feedback ledger features
- collapse typed memory into a single store
- vary top-k and ttl policy
- remove stale-memory penalties from the reward
- remove write/retrieval policy separation and replace with one shared heuristic score

## Success Gates

- offline: `+5%` write precision, `+5%` useful retrieval rate, no increase in pollution rate versus rule-based typed memory
- online: positive task success lift and SQL success lift with non-negative token reduction and latency reduction
- safety: stale rate must not increase and privacy-blocked memories must never be injected

## Risks

- reward delay can misattribute value
- noisy user feedback can contaminate the ledger
- stale business rules can look helpful in the short term
- offline replay labels may over-credit memories that correlate with success but did not cause it

## Rollout

- stage A: observability and rules
- stage B: contextual bandit online
- stage C: full RL with replay and safeguarded deployment

## Expected Failure Readouts

- better write precision but flat task success: retrieval policy is bottlenecked
- better retrieval hit rate but worse task success: retrieved memory is semantically relevant but behaviorally harmful
- lower token cost with worse SQL success: retrieval policy is over-skipping useful memory
