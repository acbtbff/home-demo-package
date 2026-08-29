export function createPhotoRealityTestRecord({ photoCount = 0, analysisMode = 'unknown', draftValidationPassed = false, startedAt = null, completedAt = null } = {}) {
  return {
    photoCount,
    analysisMode,
    startedAt,
    completedAt,
    analysisDurationMs: startedAt && completedAt ? Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime()) : null,
    draftValidationPassed,
    room: { actualWidth: null, predictedWidth: null, actualDepth: null, predictedDepth: null },
    openings: { actualDoors: null, predictedDoors: null, actualWindows: null, predictedWindows: null },
    notes: [],
  }
}
