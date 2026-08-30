export function adaptSpatialFacts({ spatialAnalysis, furnitureId } = {}) {
  const facts = spatialAnalysis?.byFurnitureId?.[furnitureId] ?? null
  return {
    physicalFit: null,
    availablePlacementArea: null,
    remainingClearanceCm: null,
    mainCirculationWidthCm: null,
    secondaryCirculationWidthCm: null,
    doorObstruction: null,
    windowObstruction: null,
    lightingImpact: null,
    functionalAreaImpact: null,
    collision: facts?.collisionDetected ?? null,
    installationFeasibility: null,
    diagnostics: facts ? { outOfBounds: facts.outOfBounds, collisionDetected: facts.collisionDetected, collidingFurnitureIds: facts.collidingFurnitureIds, collidingWallIds: facts.collidingWallIds } : null,
  }
}
