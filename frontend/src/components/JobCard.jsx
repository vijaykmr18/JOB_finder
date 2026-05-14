import { Bookmark, Building2, CheckCircle2, ExternalLink, MapPin, Send, X } from 'lucide-react';

function salaryLabel(salary) {
  if (!salary?.raw && !salary?.min && !salary?.max) return 'Salary not listed';
  if (salary.raw) return salary.raw;
  const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  if (salary.min && salary.max) return `${salary.currency || 'USD'} ${formatter.format(salary.min)}-${formatter.format(salary.max)}`;
  return `${salary.currency || 'USD'} ${formatter.format(salary.min || salary.max)}`;
}

export default function JobCard({ match, canApply, onApply, onStatus }) {
  const { job } = match;
  const applied = match.status === 'applied';
  const bookmarked = match.status === 'bookmarked';
  const chanceClass = match.hiringChance >= 75 ? 'good' : match.hiringChance >= 55 ? 'mid' : 'low';

  return (
    <article className={`job-card ${applied ? 'applied' : ''}`}>
      <div className="job-card-header">
        <span className="rank-pill">#{match.rank}</span>
        <div className="score-pair">
          <div>
            <span>Match</span>
            <strong>{match.matchScore}%</strong>
          </div>
          <div className={chanceClass}>
            <span>Chance</span>
            <strong>{match.hiringChance}%</strong>
          </div>
        </div>
      </div>

      <h2>{job.title}</h2>
      <div className="job-meta">
        <span>
          <Building2 size={15} />
          {job.company}
        </span>
        <span>
          <MapPin size={15} />
          {job.location}
        </span>
      </div>

      <p className="job-description">{job.description}</p>

      <div className="skill-row">
        {(job.skills || []).slice(0, 5).map((skill) => (
          <span key={skill}>{skill}</span>
        ))}
      </div>

      <div className="match-notes">
        <p>{match.explanation}</p>
        {match.strengths?.length ? <span>Strengths: {match.strengths.slice(0, 3).join(', ')}</span> : null}
        {match.gaps?.length ? <span>Gaps: {match.gaps.slice(0, 3).join(', ')}</span> : null}
      </div>

      <div className="job-footer">
        <div>
          <span className="salary">{salaryLabel(job.salary)}</span>
          <span className="source">{job.source?.name || 'Web'}</span>
        </div>

        <div className="card-actions">
          <button
            className={`icon-button ${bookmarked ? 'selected' : ''}`}
            onClick={() => onStatus(match.id, bookmarked ? 'new' : 'bookmarked')}
            title="Bookmark"
          >
            <Bookmark size={18} />
          </button>
          <button className="icon-button" onClick={() => onStatus(match.id, 'skipped')} title="Skip">
            <X size={18} />
          </button>
          <a className="icon-button" href={job.applyUrl} target="_blank" rel="noreferrer" title="Open apply link">
            <ExternalLink size={18} />
          </a>
          <button className="apply-button" onClick={onApply} disabled={!canApply || applied} title={canApply ? 'Apply' : 'Complete profile first'}>
            {applied ? <CheckCircle2 size={18} /> : <Send size={18} />}
            <span>{applied ? 'Tracked' : 'Apply'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
