import { RefreshCw, Trophy } from 'lucide-react';
import JobCard from './JobCard.jsx';

export default function JobBoard({ user, matches, loading, error, toast, onApply, onStatus, onRefresh, refreshing }) {
  const appliedToday = matches.filter((match) => match.status === 'applied').length;
  const bestScore = matches.reduce((best, match) => Math.max(best, match.matchScore || 0), 0);
  const progress = Math.min(100, (appliedToday / 3) * 100);

  return (
    <section className="job-board">
      <div className="hero-band">
        <div>
          <span className="eyebrow">Daily run</span>
          <h1>Top 25 jobs ranked for you</h1>
          <p>Match score, hiring chance, and apply links are refreshed from live job feeds.</p>
        </div>
        <div className="daily-quest">
          <div className="quest-row">
            <Trophy size={18} />
            <span>Apply quest</span>
            <strong>{appliedToday}/3</strong>
          </div>
          <div className="meter">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="stats-strip">
        <div>
          <span>Best match</span>
          <strong>{bestScore}%</strong>
        </div>
        <div>
          <span>Daily jobs</span>
          <strong>{matches.length}</strong>
        </div>
        <div>
          <span>Total XP</span>
          <strong>{user?.stats?.xp || 0}</strong>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="job-list">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="job-skeleton" key={index} />
          ))}
        </div>
      ) : matches.length ? (
        <div className="job-list">
          {matches.map((match) => (
            <JobCard
              key={match.id}
              match={match}
              canApply={Boolean(user?.profileReady)}
              onApply={() => onApply(match)}
              onStatus={onStatus}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No matches yet</h2>
          <p>Complete the sidebar profile and refresh today’s jobs.</p>
          <button className="primary-button" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={17} className={refreshing ? 'spin' : ''} />
            <span>Refresh Jobs</span>
          </button>
        </div>
      )}
    </section>
  );
}
