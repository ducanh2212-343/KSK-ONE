import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthGate } from './features/auth/AuthGate'
import { ParentDashboard } from './features/parent/ParentDashboard'

function PhasePlaceholder({ surface }: { surface: 'child' | 'display' }) {
  const { slug } = useParams()
  return (
    <main className="placeholder-page">
      <section className="placeholder-card">
        <div className="brand-mark">K</div>
        <p className="eyebrow">KSK One · Giai đoạn 2</p>
        <h1>{surface === 'display' ? 'Màn hình TV' : `Màn hình của ${slug ?? 'con'}`}</h1>
        <p>Đường dẫn đã được giữ chỗ. Chức năng sẽ được xây sau khi Giai đoạn 1 và quyền dữ liệu được kiểm tra.</p>
        <a className="button primary" href="/ksk/parent">Về màn hình bố mẹ</a>
      </section>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/ksk/parent" replace />} />
      <Route path="/ksk/parent" element={<AuthGate><ParentDashboard /></AuthGate>} />
      <Route path="/ksk/child/:slug" element={<PhasePlaceholder surface="child" />} />
      <Route path="/ksk/display" element={<PhasePlaceholder surface="display" />} />
      <Route path="*" element={<Navigate to="/ksk/parent" replace />} />
    </Routes>
  )
}

