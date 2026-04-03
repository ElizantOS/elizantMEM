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

## Eight-Module Loop

### 1. Event Capture

- record request, role, domain, tools, SQL, retries, tokens, latency, final outcome

### 2. Candidate Generator

- extract candidate memories from user statements, successful traces, error recovery, and repeated workflows

### 3. Memory Scorer

- estimate novelty, reuse, stability, helpfulness, and risk

### 4. Write Policy

- action space starts with skip, write, merge, replace, ttl-short, ttl-long

### 5. Memory Store

- split into episodic, semantic, and procedural layers

### 6. Retrieval Policy

- decide whether to retrieve and which memory types or top-k mixture to inject

### 7. Execution Contextualizer

- rerank and compress retrieved memories before they enter planning or tool use

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
