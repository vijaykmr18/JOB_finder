import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Lock, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage() {
  const { signin, signup } = useAuth();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSignup = mode === 'signup';

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignup) {
        await signup({ ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() });
      } else {
        await signin({ email: form.email.trim().toLowerCase(), password: form.password });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand-lockup">
          <div className="brand-mark">
            <BriefcaseBusiness size={24} />
          </div>
          <div>
            <h1>Job Chance Hunter</h1>
            <p>Daily ranked jobs for serious applications.</p>
          </div>
        </div>

        <div className="segmented" role="tablist">
          <button
            className={mode === 'signin' ? 'active' : ''}
            onClick={() => {
              setMode('signin');
              setError('');
            }}
            type="button"
          >
            Sign In
          </button>
          <button
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            type="button"
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {isSignup && (
            <label>
              <span>Name</span>
              <div className="input-shell">
                <UserRound size={18} />
                <input
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  autoComplete="name"
                  minLength={2}
                  required
                />
              </div>
            </label>
          )}

          <label>
            <span>Email</span>
            <div className="input-shell">
              <Mail size={18} />
              <input
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className="input-shell">
              <Lock size={18} />
              <input
                value={form.password}
                onChange={(event) => update('password', event.target.value)}
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                minLength={8}
                required
              />
            </div>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button wide" type="submit" disabled={loading}>
            <span>{loading ? 'Working' : isSignup ? 'Create Account' : 'Enter Dashboard'}</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </section>

      <section className="auth-art" aria-hidden="true">
        <div className="score-tile top">
          <span>Match</span>
          <strong>92</strong>
        </div>
        <div className="job-stack-card">
          <span className="rank-pill">Daily 25</span>
          <h2>Full Stack Developer</h2>
          <p>High fit, strong skill overlap, clean apply path.</p>
          <div className="meter">
            <span style={{ width: '86%' }} />
          </div>
        </div>
        <div className="score-tile bottom">
          <span>Chance</span>
          <strong>78</strong>
        </div>
      </section>
    </main>
  );
}
