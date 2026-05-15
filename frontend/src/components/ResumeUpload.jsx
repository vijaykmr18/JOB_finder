import { FileText, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client.js';

export default function ResumeUpload({ setUser, onUploaded }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMessage('');

    try {
      const data = await api.uploadResume(file);
      setUser(data.user);
      const detected = data.parsedSkills?.length || 0;
      const missing = data.missingFields?.length ? ` Finish: ${data.missingFields.join(', ')}.` : ' Profile ready.';
      setMessage(`${detected} skills detected.${missing}`);
      setFile(null);
      await onUploaded?.();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tool-panel">
      <div className="panel-title">
        <h3>Resume</h3>
        <FileText size={18} />
      </div>

      <label className="drop-zone">
        <UploadCloud size={24} />
        <span>{file ? file.name : 'Upload PDF'}</span>
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setMessage('');
          }}
        />
      </label>

      <button className="secondary-button wide" onClick={upload} disabled={!file || busy} type="button">
        {busy ? 'Parsing' : 'Parse Resume'}
      </button>
      {message && <p className={message.includes('detected') ? 'form-success' : 'form-error'}>{message}</p>}
    </section>
  );
}
