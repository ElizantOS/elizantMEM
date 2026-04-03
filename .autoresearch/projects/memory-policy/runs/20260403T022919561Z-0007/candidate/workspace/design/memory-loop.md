# Memory Loop Design

## Objective

Upgrade agent memory from passive storage to an explicit decision loop that learns:

- what to write
- what to skip
- when to retrieve
- what type of memory to retrieve
- when a memory has become stale or harmful

## Typed Memory Unit

Each memory unit should include:

- identity: memory id, tenant id, scope
- type: preference, schema, query pattern, business rule, exception case, skill case
- content: text body and compact summary
- provenance: source event ids and trace ids
- metadata: domain, tables, metrics, confidence, ttl, privacy
- lifecycle stats: retrieved count, used count, helpful count, harmful count, last used, value score

## Policy Boundary

The system must preserve two distinct decision policies:

- `write policy`: decides whether a candidate memory should enter or modify the store after an event
- `retrieval policy`: decides whether any memory should be fetched for the current step and which memory slices should be injected

These policies can share features and reward signals, but they should not share the same action head or be evaluated as one merged classifier. The write policy operates after evidence-producing events. The retrieval policy operates before or during execution.

## Decision Interface

### Write Policy

- observation: candidate type, source event type, novelty score, similarity to existing memories, confidence, privacy scope, expected reuse horizon, recent failure context
- actions: skip, write-new, merge-into-existing, replace-existing, write-with-short-ttl, write-with-long-ttl, escalate-for-review
- immediate labels: candidate validity, duplication risk, scope violation risk
- delayed labels: future retrieval count, future helpful use, future harmful use, stale expiry outcome

### Retrieval Policy

- observation: task type, user goal, domain, current tool plan, uncertainty level, cost budget, memory-store health, candidate memory scores
- actions: skip-retrieval, retrieve-semantic, retrieve-episodic, retrieve-procedural, retrieve-mixed-top-k, request-memory-refresh
- immediate labels: retrieval hit rate, injected token cost, over-retrieval rate
- delayed labels: task success, SQL success, retry reduction, latency reduction, harmful-context events

## Ledger Schema

Each task run should append one ledger row per write decision and one ledger row per retrieval decision so credit assignment stays inspectable.

Required columns:

- `run_id`, `turn_id`, `tenant_id`, `task_type`
- `policy_type` (`write` or `retrieval`)
- `observation_snapshot_id`
- `action`
- `candidate_ids`
- `memory_ids_touched`
- `pre_metrics`: token budget, latency budget, store size, recent pollution rate
- `post_metrics`: task success, sql success, retries, token delta, latency delta
- `human_or_proxy_feedback`
- `helpful_flag`, `harmful_flag`, `stale_flag`, `duplicate_flag`
- `reward`

## Reward Attribution Rules

The reward should be decomposed rather than logged as one opaque scalar.

- write reward: future helpful retrievals minus duplicate writes minus stale or harmful downstream events minus storage growth penalty
- retrieval reward: task success lift plus SQL success lift plus retry reduction plus token reduction plus latency reduction minus harmful-context penalty minus over-retrieval penalty

The ledger should store both component terms and final reward so offline replay can test alternative reward formulas without regenerating traces.

## Eight-Module Loop

### 1. Event Capture

- record request, role, domain, tools, SQL, retries, tokens, latency, final outcome

### 2. Candidate Generator

- extract candidate memories from user statements, successful traces, error recovery, and repeated workflows

### 3. Memory Scorer

- estimate novelty, reuse, stability, helpfulness, and risk

### 4. Write Policy

- action space starts with skip, write, merge, replace, ttl-short, ttl-long
- outputs decision plus rationale fields so later audits can inspect why a memory entered the store

### 5. Memory Store

- split into episodic, semantic, and procedural layers
- maintain memory version ids so replacement and stale-rate accounting are measurable

### 6. Retrieval Policy

- decide whether to retrieve and which memory types or top-k mixture to inject
- expose retrieve-or-skip separately from reranking so policy regret can be estimated

### 7. Execution Contextualizer

- rerank and compress retrieved memories before they enter planning or tool use
- log which injected memories were actually referenced by the executor or tool chain

### 8. Feedback Ledger

- log retrieved, injected, referenced, helped, harmed, delta token, delta latency, downstream outcome

## Policy Learning Path

### Rules

- threshold-based write and retrieval gates to establish observability

### Contextual Bandit

- optimize write-or-skip and retrieve-or-skip under immediate downstream reward

### Multi-Step RL

- optimize the full trajectory from retrieval to execution to delayed writeback reward

## Reward Sketch

- positive: future reuse, task success, SQL success, lower retry count, lower token cost, lower latency
- negative: wrong answers, duplicates, stale retrievals, harmful context injection, storage growth

## Implementation Notes

- keep the trace format explicit enough for offline replay
- treat write policy and retrieval policy as separate but coupled learners
- preserve privacy and role scope in every memory unit
- start with rules that emit the same ledger schema expected by later bandit and RL stages
- make every memory decision reproducible from trace plus store snapshot so offline counterfactual evaluation is possible

## Minimal Build Sequence

1. Implement deterministic event capture and candidate generation with stable ids.
2. Add rule-based write policy and retrieval policy that emit full ledger rows.
3. Build replay tooling that can recompute rewards from ledger components.
4. Add contextual-bandit heads for write and retrieval separately.
5. Introduce multi-step RL only after offline replay labels and online guardrails are stable.
