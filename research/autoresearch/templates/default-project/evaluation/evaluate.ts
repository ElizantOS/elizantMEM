import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

type MetricSpec = {
  id: string
  kind:
    | 'length'
    | 'headings'
    | 'coverage'
    | 'exists_min_length'
    | 'list_items'
    | 'table_rows'
  file: string
  target?: number
  weight: number
  terms?: string[]
}

type MetricContract = {
  metrics: MetricSpec[]
}

const root = process.cwd()

function read(relativePath: string): string {
  const fullPath = join(root, relativePath)
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : ''
}

function coverage(text: string, terms: string[]): number {
  if (terms.length === 0) return 0
  const matched = terms.filter(term =>
    text.toLowerCase().includes(term.toLowerCase()),
  ).length
  return matched / terms.length
}

function headingCount(text: string): number {
  return text
    .split('\n')
    .filter(line => line.trim().startsWith('#')).length
}

function listItemCount(text: string): number {
  return text
    .split('\n')
    .filter(line => /^(\s*[-*]\s+|\s*\d+\.\s+)/.test(line)).length
}

function tableRowCount(text: string): number {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.includes('|'))

  return lines.filter(
    line => line !== '' && !/^[:|\-\s]+$/.test(line.replaceAll('|', '')),
  ).length
}

const contract = JSON.parse(
  read('control/metric-contract.json'),
) as MetricContract

const metrics: Record<string, number> = {}
let weightedScore = 0

for (const metric of contract.metrics) {
  const text = read(metric.file)
  let value = 0

  switch (metric.kind) {
    case 'length':
      value = Math.min(text.trim().length / Math.max(metric.target ?? 1, 1), 1)
      break
    case 'headings':
      value = Math.min(headingCount(text) / Math.max(metric.target ?? 1, 1), 1)
      break
    case 'coverage':
      value = coverage(text, metric.terms ?? [])
      break
    case 'exists_min_length':
      value = text.trim().length >= (metric.target ?? 1) ? 1 : 0
      break
    case 'list_items':
      value = Math.min(listItemCount(text) / Math.max(metric.target ?? 1, 1), 1)
      break
    case 'table_rows':
      value = Math.min(tableRowCount(text) / Math.max(metric.target ?? 1, 1), 1)
      break
  }

  metrics[metric.id] = value
  weightedScore += value * metric.weight
}

const score = Number(weightedScore.toFixed(3))
const summary =
  score >= 7
    ? 'Project artifacts are coherent enough for autonomous iteration.'
    : 'Project needs stronger literature grounding, experiment structure, or iteration notes.'

console.log(JSON.stringify({ score, summary, metrics }, null, 2))
