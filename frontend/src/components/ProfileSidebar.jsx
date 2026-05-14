import { Award, MapPin, Target } from 'lucide-react';
import ProfileForm from './ProfileForm.jsx';
import ResumeUpload from './ResumeUpload.jsx';

export default function ProfileSidebar({ user, setUser, onProfileChanged }) {
  const stats = user?.stats || {};
  const profile = user?.profile || {};
  const readyCount =
    Number(Boolean(user?.resumeUploaded)) +
    Number(Boolean(profile.targetRole)) +
    Number(Boolean(profile.preferredSkills?.length)) +
    Number(Boolean(profile.locations?.length)) +
    Number(Boolean(profile.salaryMin));

  return (
    <aside className="profile-sidebar">
      <section className="identity-panel">
        <div>
          <span className="avatar">{user?.name?.slice(0, 1)?.toUpperCase() || 'J'}</span>
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
        </div>
        <div className="level-ring">
          <strong>{stats.xp || 0}</strong>
          <span>XP</span>
        </div>
      </section>

      <section className="quest-panel">
        <div className="quest-row">
          <Target size={17} />
          <span>Setup</span>
          <strong>{readyCount}/5</strong>
        </div>
        <div className="meter">
          <span style={{ width: `${(readyCount / 5) * 100}%` }} />
        </div>
        <div className="mini-stats">
          <span>
            <Award size={15} />
            {stats.applications || 0} applied
          </span>
          <span>
            <MapPin size={15} />
            {profile.locations?.[0] || 'Location'}
          </span>
        </div>
      </section>

      <ResumeUpload setUser={setUser} onUploaded={onProfileChanged} />
      <ProfileForm user={user} setUser={setUser} onSaved={onProfileChanged} />
    </aside>
  );
}
