import { INITIAL_ROOM_DOCUMENT } from '../data/initialRoomDocument.js'
import { RoomDocumentContext } from './roomDocumentContext.js'
import { useRoomDocument } from './useRoomDocument.js'

export function RoomDocumentProvider({ children }) {
  const roomDocument = useRoomDocument(INITIAL_ROOM_DOCUMENT)

  return <RoomDocumentContext.Provider value={roomDocument}>{children}</RoomDocumentContext.Provider>
}
