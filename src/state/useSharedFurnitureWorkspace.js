import { useContext } from 'react'
import { FurnitureWorkspaceContext } from './furnitureWorkspaceContext.js'

export function useSharedFurnitureWorkspace() {
  const context = useContext(FurnitureWorkspaceContext)
  if (!context) throw new Error('useSharedFurnitureWorkspace must be used inside FurnitureWorkspaceProvider')
  return context
}
