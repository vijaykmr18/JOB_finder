import { useCallback, useEffect, useState } from 'react';
import { LogOut, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import JobBoard from '../components/JobBoard.jsx';
import ProfileSidebar from '../components/ProfileSidebar.jsx';

export default function DashboardPage() {
  const { user, setUser, logout } = useAuth();
  const [matches, setMatches] = useState([]);
  const [batchDate, setBatchDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const loadJobs = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = refresh ? await api.refreshJobs() : await api.getTodayJobs();
      setMatches(data.matches || []);
      setBatchDate(data.batchDate);
      if (data.user) setUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setUser]);

  useEffect(() => {
    loadJobs(false);
  }, [loadJobs]);

  async function handleApply(match) {
    setError('');
    try {
      const data = await api.apply(match.id);
      setMatches((current) => current.map((item) => (item.id === match.id ? data.match : item)));
      setUser(data.user);
      setToast('Application tracked. Opening apply page.');
      window.open(data.applyUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStatus(matchId, status) {
    try {
      const data = await api.setMatchStatus(matchId, status);
      setMatches((current) => current.map((item) => (item.id === matchId ? data.match : item)));
      if (data.user) setUser(data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand-mini">
          <div className="brand-mark small">
            <Sparkles size={19} />
          </div>
          <div>
            <strong>Job Chance Hunter</strong>
            <span>{batchDate || 'Today'}</span>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="trust-badge">
            <ShieldCheck size={16} />
            <span>Private resume scoring</span>
          </div>
          <button className="icon-button" onClick={() => loadJobs(true)} disabled={refreshing} title="Refresh jobs">
            <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
          </button>
          <button className="icon-button" onClick={logout} title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        <ProfileSidebar user={user} setUser={setUser} onProfileChanged={() => loadJobs(true)} />
        <JobBoard
          user={user}
          matches={matches}
          loading={loading}
          error={error}
          toast={toast}
          onApply={handleApply}
          onStatus={handleStatus}
          onRefresh={() => loadJobs(true)}
          refreshing={refreshing}
        />
      </div>
    </main>
  );
}
