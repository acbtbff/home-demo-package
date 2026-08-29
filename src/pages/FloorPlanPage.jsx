import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FloorPlanEditor from '../components/floorplan/FloorPlanEditor.jsx'
import FloorPlanImport from '../components/floorplan/FloorPlanImport.jsx'
import PhotoRoomCapture from '../components/PhotoRoomCapture.jsx'
import { FEATURES } from '../config/features.js'
import { validateRoomDocument } from '../domain/roomValidation.js'
import { useSharedRoomDocument } from '../state/useSharedRoomDocument.js'

export default function FloorPlanPage() {
  const navigate = useNavigate()
  const { document, dispatch } = useSharedRoomDocument()
  const [showFloorplanImport, setShowFloorplanImport] = useState(FEATURES.floorplanImport)
  const [floorplanDiagnostics, setFloorplanDiagnostics] = useState(null)
  const [showPhotoCapture, setShowPhotoCapture] = useState(false)
  const [photoDiagnostics, setPhotoDiagnostics] = useState(null)
  const validationErrors = validateRoomDocument(document)

  useEffect(() => {
    if (import.meta.env.DEV && validationErrors.length > 0) {
      console.warn('[RoomDocument validation]', validationErrors)
    }
  }, [validationErrors])

  if (FEATURES.photoRoomScan && showPhotoCapture) {
    return <PhotoRoomCapture
      onCancel={() => setShowPhotoCapture(false)}
      onDraftReady={(nextDocument, diagnostics) => {
        dispatch({ type: 'RESET_DOCUMENT', document: nextDocument })
        setPhotoDiagnostics(diagnostics)
        setShowPhotoCapture(false)
      }}
    />
  }

  if (FEATURES.floorplanImport && showFloorplanImport) {
    return <FloorPlanImport
      currentDocument={document}
      onUseExisting={() => setShowFloorplanImport(false)}
      onComplete={(nextDocument, diagnostics) => {
        dispatch({ type: 'RESET_DOCUMENT', document: nextDocument })
        setFloorplanDiagnostics(diagnostics)
        setShowFloorplanImport(false)
      }}
    />
  }

  return <FloorPlanEditor
    document={document}
    dispatch={dispatch}
    validationErrors={validationErrors}
    onFloorplanImport={FEATURES.floorplanImport ? () => setShowFloorplanImport(true) : null}
    floorplanDiagnostics={floorplanDiagnostics}
    onPhotoCapture={FEATURES.photoRoomScan ? () => setShowPhotoCapture(true) : null}
    photoDiagnostics={FEATURES.photoRoomScan ? photoDiagnostics : null}
    onConfirm3D={() => navigate('/room')}
  />
}
