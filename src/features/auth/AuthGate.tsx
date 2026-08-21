import { useEffect, useState, type PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { SignInPage } from './SignInPage'

export function AuthGate({ children, displayOnly = false }: PropsWithChildren<{ displayOnly?: boolean }>) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) return children
  if (loading) return <div className="center-state">Đang kiểm tra phiên đăng nhập…</div>
  if (!session && displayOnly) {
    return (
      <main className="display-locked">
        <div className="display-logo">K</div>
        <h1>KSK One</h1>
        <p>Màn hình TV chưa được cấp quyền trên thiết bị này.</p>
        <a href="/ksk/parent">Mở trang cấp quyền</a>
      </main>
    )
  }
  if (!session) return <SignInPage />
  return children
}

