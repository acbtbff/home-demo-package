import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import { RoomDocumentProvider } from './state/RoomDocumentContext.jsx'
import FloorPlanPage from './pages/FloorPlanPage.jsx'
import FurniturePage from './pages/FurniturePage.jsx'
import HomePage from './pages/HomePage.jsx'
import RoomPage from './pages/RoomPage.jsx'
import './App.css'

function App() {
  return (
    <RoomDocumentProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/floorplan" element={<FloorPlanPage />} />
          <Route path="/room" element={<RoomPage />} />
          <Route path="/furniture" element={<FurniturePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </RoomDocumentProvider>
  )
}

export default App
