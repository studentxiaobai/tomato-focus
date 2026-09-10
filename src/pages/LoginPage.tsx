import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock3, Headphones, ListChecks, Mail, LockKeyhole, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { toUserMessage } from '../lib/errors';
import { demoCoverUrl } from '../lib/media';

type Mode = 'signin' | 'signup' | 'forgot';

export function LoginPage() {
  const { user, initializing, isConfigured, signIn, signUp, requestPasswordReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { notify } = useToast();
  const [mode, setMode] = useState<Mode>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(
    searchParams.get('verified') ? '邮箱验证已完成，现在可以登录了。' : '',
  );

  if (!initializing && user) return <Navigate to="/app" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        navigate((location.state as { from?: string } | null)?.from || '/app', { replace: true });
      } else if (mode === 'signup') {
        const session = await signUp(email, password, displayName);
        if (session) {
          navigate('/app', { replace: true });
        } else {
          setMessage('注册成功。我们已发送验证邮件，请打开邮件中的链接后再登录。');
        }
      } else {
        await requestPasswordReset(email);
        setMessage('重置密码邮件已发送，请检查收件箱和垃圾邮件。');
      }
    } catch (error) {
      const text = toUserMessage(error);
      setMessage(text);
      notify(text, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const formTitle = mode === 'signin' ? '欢迎回来' : mode === 'signup' ? '创建专注空间' : '找回密码';
  const submitText = mode === 'signin' ? '登录' : mode === 'signup' ? '注册账号' : '发送重置邮件';

  return (
    <main className="auth-page" style={demoCoverUrl ? { backgroundImage: `url("${demoCoverUrl}")` } : undefined}>
      <div className="auth-page__scrim" />
      <section className="auth-story" aria-label="功能介绍">
        <div className="brand-lockup">
          <span className="brand-lockup__mark"><Clock3 size={22} /></span>
          <span>番茄闹钟</span>
        </div>
        <div className="auth-story__copy">
          <p className="eyebrow">FOCUS, ONE SLICE AT A TIME</p>
          <h1>把注意力留给<br />真正重要的事。</h1>
          <p>用清晰的番茄节奏、属于你的背景与声音，把每一次专注稳稳累积起来。</p>
        </div>
        <div className="auth-features">
          <span><Clock3 size={17} /> 完整番茄自动累计</span>
          <span><ListChecks size={17} /> 任务进度随时可见</span>
          <span><Headphones size={17} /> 私人背景音乐空间</span>
        </div>
      </section>

      <section className="auth-card glass-panel">
        <div className="auth-card__heading">
          <p className="eyebrow">{mode === 'signup' ? 'START FRESH' : mode === 'forgot' ? 'RESET ACCESS' : 'CONTINUE FOCUS'}</p>
          <h2>{formTitle}</h2>
          <p>
            {mode === 'signup'
              ? '注册后，任务、学习记录和素材都会安全同步。'
              : mode === 'forgot'
                ? '输入邮箱，我们会发送安全的重置链接。'
                : '登录后继续你的番茄节奏。'}
          </p>
        </div>

        {!isConfigured && (
          <div className="setup-notice">
            <strong>还需要连接 Supabase</strong>
            <p>复制 <code>.env.example</code> 为 <code>.env.local</code>，填入项目地址和匿名密钥后重启网站。</p>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              <span>你的称呼</span>
              <div className="input-shell">
                <UserRound size={17} />
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="例如：小番茄"
                  autoComplete="nickname"
                  required
                />
              </div>
            </label>
          )}

          <label>
            <span>邮箱</span>
            <div className="input-shell">
              <Mail size={17} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          {mode !== 'forgot' && (
            <label>
              <span>密码</span>
              <div className="input-shell">
                <LockKeyhole size={17} />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="至少 6 个字符"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={6}
                  required
                />
              </div>
            </label>
          )}

          {message && <p className="form-message" role="status">{message}</p>}

          <button className="primary-button" type="submit" disabled={submitting || !isConfigured}>
            {submitting ? '请稍候…' : submitText}
            {!submitting && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-card__switch">
          {mode === 'signin' && (
            <>
              <button type="button" onClick={() => { setMode('signup'); setMessage(''); }}>没有账号？注册</button>
              <button type="button" onClick={() => { setMode('forgot'); setMessage(''); }}>忘记密码</button>
            </>
          )}
          {mode !== 'signin' && (
            <button type="button" onClick={() => { setMode('signin'); setMessage(''); }}>返回登录</button>
          )}
        </div>
      </section>
    </main>
  );
}
