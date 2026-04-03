# Memory Loop Design

## Objective

Upgrade agent memory from passive storage to an explicit decision loop that learns:

- what to write
- what to skip
- when to retrieve
- what type of memory to retrieve
- when a memory has become stale or harmful

The design target is a data-analysis assistant that answers business questions, writes SQL, consults tools, and improves across repeated tenants and domains. The system must keep write policy and retrieval policy separate so that storage decisions are not conflated with context-injection decisions.

## Typed Memory Unit

Each memory unit should include:

- identity: memory id, tenant id, scope
- type: preference, schema, query pattern, business rule, exception case, skill case
- content: text body and compact summary
- provenance: source event ids and trace ids
- metadata: domain, tables, metrics, confidence, ttl, privacy
- lifecycle stats: retrieved count, used count, helpful count, harmful count, last used, value score

## Policy Boundary

### Write Policy Owns

- deciding whether a candidate becomes durable memory
- choosing write action: skip, write, merge, replace, ttl-short, ttl-long
- assigning memory type, scope, and initial confidence
- protecting the store from pollution, duplication, and privacy violations

### Retrieval Policy Owns

- deciding whether retrieval is needed for the current task
- selecting memory type filters, ranking policy, and top-k budget
- compressing or excluding memories before prompt injection
- minimizing unnecessary context growth and stale-memory exposure

## State, Action, Reward

### Write Policy State

- current request features: domain, user role, tool plan, ambiguity level
- candidate features: novelty, stability, confidence, trace success, future reuse prior
- store features: similar memory count, ttl pressure, type budget, tenant scope

### Retrieval Policy State

- task features: requested analysis type, tables mentioned, prior failures, retry count
- store features: type coverage, recent helpful memories, stale-risk estimates
- budget features: available context tokens, latency target, retrieval cost

### Reward

- positive reward: task success, sql success, lower retries, token reduction, latency reduction, explicit user acceptance
- negative reward: wrong answer, stale retrieval, privacy misscope, duplicate memory, irrelevant retrieval, storage growth
- delayed reward: attribute future-window value back to the write and retrieval decisions that caused it

### Credit Assignment

- every memory decision emits a decision id into the feedback ledger
- later execution traces reference the decision ids of retrieved or inherited memories
- reward is assigned with a configurable future window and discounted by attribution confidence

## Eight-Module Loop

### 1. Event Capture

- record request, role, domain, tools, SQL, retries, tokens, latency, final outcome
- store structured traces so offline replay can reconstruct candidate generation and retrieval conditions

### 2. Candidate Generator

- extract candidate memories from user statements, successful traces, error recovery, and repeated workflows
- emit typed candidates with source snippets, confidence, and proposed ttl instead of raw free text

### 3. Memory Scorer

- estimate novelty, reuse, stability, helpfulness, and risk
- produce separate scores for write value and likely retrieval value so the system can reject "interesting but not useful" memories

### 4. Write Policy

- action space starts with skip, write, merge, replace, ttl-short, ttl-long
- write policy should be able to decline storage even for successful traces when novelty is low or stale risk is high

### 5. Memory Store

- split into episodic, semantic, and procedural layers
- retain explicit scope keys so retrieval cannot cross tenant, role, or privacy boundaries

### 6. Retrieval Policy

- decide whether to retrieve and which memory types or top-k mixture to inject
- treat retrieve-or-skip as a first-class action before ranking, not an always-on query to the store

### 7. Execution Contextualizer

- rerank and compress retrieved memories before they enter planning or tool use
- annotate injected memories with ids so downstream traces can record which memories were actually used

### 8. Feedback Ledger

- log retrieved, injected, referenced, helped, harmed, delta token, delta latency, downstream outcome
- distinguish `retrieved`, `injected`, `used`, and `helpful` so the agent can learn from near-misses and over-retrieval

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

## Minimal Interfaces

### Candidate Record

- `candidate_id`
- `source_event_ids`
- `memory_type`
- `candidate_text`
- `summary`
- `novelty_score`
- `stability_score`
- `risk_score`
- `proposed_scope`
- `proposed_ttl`

### Memory Record

- `memory_id`
- `memory_type`
- `content`
- `summary`
- `scope`
- `ttl`
- `confidence`
- `created_from_candidate_id`
- `lifecycle_stats`

### Feedback Ledger Record

- `decision_id`
- `policy_type`
- `action`
- `memory_ids`
- `task_id`
- `retrieved`
- `injected`
- `used`
- `outcome_reward`
- `delta_tokens`
- `delta_latency_ms`
- `failure_tags`

## Failure Controls

- stale guard: suppress memories past ttl unless they have recent confirmed reuse
- pollution guard: cap writes when duplicate rate or harmful rate exceeds threshold
- budget guard: retrieval policy must justify top-k above a fixed context budget
- privacy guard: deny retrieval if scope match is incomplete
- rollback guard: any learned policy can fall back to rule mode when online metrics regress

## Implementation Notes

- keep the trace format explicit enough for offline replay
- treat write policy and retrieval policy as separate but coupled learners
- preserve privacy and role scope in every memory unit
- implement rules first so every later learner inherits stable observability and counterfactual data
