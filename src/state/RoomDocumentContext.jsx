import { DEMO_ROOM_DOCUMENT } from '../data/demoRoomDocument.js'
import { RoomDocumentContext } from './roomDocumentContext.js'
import { useRoomDocument } from './useRoomDocument.js'

export function RoomDocumentProvider({ children }) {
  const roomDocument = useRoomDocument(DEMO_ROOM_DOCUMENT)

  return <RoomDocumentContext.Provider value={roomDocument}>{children}</RoomDocumentContext.Provider>
}
