import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { toUserMessage } from '../lib/errors';

export function ResetPasswordPage() {
  const { user, initializing, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!initializing && !user) return <Navigate to="/login" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      setMessage('两次输入的密码不一致。');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      await updatePassword(password);
      notify('密码已更新，请使用新密码登录。', 'success');
      navigate('/app', { replace: true });
    } catch (error) {
      const text = toUserMessage(error);
      setMessage(text);
      notify(text, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="center-page">
      <section className="auth-card glass-panel auth-card--standalone">
        <div className="auth-card__heading">
          <p className="eyebrow">SECURE RESET</p>
          <h2>设置新密码</h2>
          <p>新密码至少需要 6 个字符。</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>新密码</span>
            <div className="input-shell">
              <KeyRound size={17} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                autoComplete="new-password"
                required
              />
            </div>
          </label>
          <label>
            <span>再次输入</span>
            <div className="input-shell">
              <KeyRound size={17} />
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                minLength={6}
                autoComplete="new-password"
                required
              />
            </div>
          </label>
          {message && <p className="form-message" role="status">{message}</p>}
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? '正在更新…' : '更新密码'}
            {!submitting && <ArrowRight size={18} />}
          </button>
        </form>
      </section>
    </main>
  );
}
