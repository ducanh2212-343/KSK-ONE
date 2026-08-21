import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthGate } from './features/auth/AuthGate'
import { ChildDashboard } from './features/child/ChildDashboard'
import { DisplayBoard } from './features/display/DisplayBoard'
import { ParentDashboard } from './features/parent/ParentDashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/ksk/parent" replace />} />
      <Route path="/ksk/parent" element={<AuthGate><ParentDashboard /></AuthGate>} />
      <Route path="/ksk/child/:slug" element={<AuthGate><ChildDashboard /></AuthGate>} />
      <Route path="/ksk/display" element={<AuthGate displayOnly><DisplayBoard /></AuthGate>} />
      <Route path="*" element={<Navigate to="/ksk/parent" replace />} />
    </Routes>
  )
}

