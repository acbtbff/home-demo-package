import { FurnitureWorkspaceContext } from './furnitureWorkspaceContext.js'
import { useFurnitureWorkspace } from './useFurnitureWorkspace.js'
import { useSharedRoomDocument } from './useSharedRoomDocument.js'

export function FurnitureWorkspaceProvider({ children }) {
  const { document } = useSharedRoomDocument()
  const workspace = useFurnitureWorkspace(document)

  return (
    <FurnitureWorkspaceContext.Provider value={workspace}>
      {children}
    </FurnitureWorkspaceContext.Provider>
  )
}
