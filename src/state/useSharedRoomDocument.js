import { useContext } from 'react'
import { RoomDocumentContext } from './roomDocumentContext.js'

export function useSharedRoomDocument() {
  const context = useContext(RoomDocumentContext)
  if (!context) throw new Error('useSharedRoomDocument must be used inside RoomDocumentProvider')
  return context
}
