import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '../api/client.js';

function join(values) {
  return Array.isArray(values) ? values.join(', ') : '';
}

export default function ProfileForm({ user, setUser, onSaved }) {
  const initial = useMemo(() => user?.profile || {}, [user]);
  const [form, setForm] = useState({
    targetRole: initial.targetRole || '',
    preferredSkills: join(initial.preferredSkills),
    locations: join(initial.locations),
    experienceYears: initial.experienceYears || 0,
    salaryMin: initial.salaryMin || '',
    salaryMax: initial.salaryMax || '',
    remotePreference: initial.remotePreference || 'any',
    jobTypes: join(initial.jobTypes)
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm({
      targetRole: initial.targetRole || '',
      preferredSkills: join(initial.preferredSkills),
      locations: join(initial.locations),
      experienceYears: initial.experienceYears || 0,
      salaryMin: initial.salaryMin || '',
      salaryMax: initial.salaryMax || '',
      remotePreference: initial.remotePreference || 'any',
      jobTypes: join(initial.jobTypes)
    });
  }, [initial]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const data = await api.updateProfile(form);
      setUser(data.user);
      setMessage('Saved');
      await onSaved?.();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="tool-panel">
      <div className="panel-title">
        <h3>Match Profile</h3>
        <span>{user?.profileReady ? 'Ready' : 'Needs details'}</span>
      </div>

      <form className="profile-form" onSubmit={submit}>
        <label>
          <span>Target role</span>
          <input value={form.targetRole} onChange={(event) => update('targetRole', event.target.value)} placeholder="Full stack developer" />
        </label>

        <label>
          <span>Preferred skills</span>
          <input
            value={form.preferredSkills}
            onChange={(event) => update('preferredSkills', event.target.value)}
            placeholder="React, Node.js, MongoDB"
          />
        </label>

        <label>
          <span>Locations</span>
          <input value={form.locations} onChange={(event) => update('locations', event.target.value)} placeholder="Bengaluru, Remote" />
        </label>

        <div className="form-pair">
          <label>
            <span>Experience</span>
            <input
              value={form.experienceYears}
              onChange={(event) => update('experienceYears', event.target.value)}
              min="0"
              max="60"
              type="number"
            />
          </label>
          <label>
            <span>Work mode</span>
            <select value={form.remotePreference} onChange={(event) => update('remotePreference', event.target.value)}>
              <option value="any">Any</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </label>
        </div>

        <div className="form-pair">
          <label>
            <span>Salary min</span>
            <input value={form.salaryMin} onChange={(event) => update('salaryMin', event.target.value)} min="0" type="number" />
          </label>
          <label>
            <span>Salary max</span>
            <input value={form.salaryMax} onChange={(event) => update('salaryMax', event.target.value)} min="0" type="number" />
          </label>
        </div>

        <label>
          <span>Job types</span>
          <input value={form.jobTypes} onChange={(event) => update('jobTypes', event.target.value)} placeholder="Full-time, Contract" />
        </label>

        <button className="primary-button wide" type="submit" disabled={saving}>
          <Save size={17} />
          <span>{saving ? 'Saving' : 'Save Profile'}</span>
        </button>
        {message && <p className={message === 'Saved' ? 'form-success' : 'form-error'}>{message}</p>}
      </form>
    </section>
  );
}
