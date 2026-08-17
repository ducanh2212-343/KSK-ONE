import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

export function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) setError('Thông tin đăng nhập chưa đúng hoặc tài khoản chưa được kích hoạt.')
    setLoading(false)
  }

  return (
    <main className="signin-page">
      <section className="signin-card">
        <div className="brand-mark">K</div>
        <p className="eyebrow">Không gian gia đình</p>
        <h1>Đăng nhập KSK One</h1>
        <p className="muted">Dành cho bố mẹ và các thành viên đã được cấp quyền.</p>
        <form className="form-stack" onSubmit={submit}>
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(item) => setEmail(item.target.value)} autoComplete="username" required />
          </label>
          <label>
            <span>Mật khẩu</span>
            <input type="password" value={password} onChange={(item) => setPassword(item.target.value)} autoComplete="current-password" required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button primary wide" type="submit" disabled={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
        <p className="security-note">KSK One không lưu mật khẩu trong mã nguồn.</p>
      </section>
    </main>
  )
}

