import { getFurnitureCapabilityReport } from '../src/domain/furnitureCapabilityRegistry.js'

const report = getFurnitureCapabilityReport()
console.log(`Furniture Capability Registry V0: ${report.total} archetypes`)
for (const [status, count] of Object.entries(report.counts)) console.log(`${status}: ${count}`)
for (const entry of report.entries) {
  const handler = entry.generatorKey ? `generator=${entry.generatorKey}` : entry.assetIds.length ? `assets=${entry.assetIds.join(',')}` : 'handler=none'
  console.log(`${entry.category}/${entry.archetype} -> ${entry.preferredStrategy} [${entry.capabilityStatus}] ${handler} fallback=${entry.fallback}`)
}
