import { useEffect, useState } from 'react';
import { noticeAPI } from '../../api/notices';

const PRIORITY = {
  normal:    { label: 'Normal',    bg: '#f8fafc', color: '#64748b', icon: 'bi-info-circle',          border: '#e2e8f0' },
  important: { label: 'Important', bg: '#fffbeb', color: '#b45309', icon: 'bi-exclamation-triangle', border: '#fde68a' },
  urgent:    { label: 'Urgent',    bg: '#fef2f2', color: '#ef4444', icon: 'bi-exclamation-octagon',  border: '#fecaca' },
};

const blank = { title: '', body: '', priority: 'normal' };

export default function NoticeBoard() {
  const [notices,  setNotices]  = useState([]);
  const [form,     setForm]     = useState(blank);
  const [editing,  setEditing]  = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [msg,      setMsg]      = useState('');

  const load = () => noticeAPI.list(true).then((r) => setNotices(r.data));
  useEffect(() => { load(); }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      editing ? await noticeAPI.update(editing, form) : await noticeAPI.create(form);
      setForm(blank); setEditing(null); setShowForm(false);
      load(); flash(editing ? 'Notice updated.' : 'Notice posted.');
    } catch (err) { flash('Error: ' + (err.response?.data?.message || err.message)); }
  };

  const startEdit = (n) => { setForm({ title: n.title, body: n.body, priority: n.priority }); setEditing(n._id); setShowForm(true); };
  const toggle    = (n) => noticeAPI.update(n._id, { active: !n.active }).then(load);
  const remove    = (n) => { if (window.confirm('Delete this notice?')) noticeAPI.remove(n._id).then(load); };

  return (
    <>
      <div className="page-header d-flex align-items-center justify-content-between">
        <div>
          <h2>Notice Board</h2>
          <p>Post announcements for subscribers</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2"
          onClick={() => { setForm(blank); setEditing(null); setShowForm(!showForm); }}>
          <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-lg'}`} />
          {showForm ? 'Cancel' : 'New Notice'}
        </button>
      </div>

      {msg && (
        <div className="alert d-flex align-items-center gap-2 mb-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, color: '#15803d' }}>
          <i className="bi bi-check-circle-fill" /> {msg}
        </div>
      )}

      {showForm && (
        <div className="app-card mb-4">
          <div className="app-card-header">
            <h5><i className="bi bi-pencil-square me-2" />{editing ? 'Edit Notice' : 'Post a Notice'}</h5>
          </div>
          <div className="app-card-body">
            <form onSubmit={onSubmit}>
              <div className="row g-3 mb-3">
                <div className="col-md-8">
                  <label className="form-label">Title</label>
                  <input className="form-control" placeholder="Notice title…" value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Body</label>
                <textarea className="form-control" rows={3} placeholder="Notice content…" value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-send me-2" />{editing ? 'Update Notice' : 'Post Notice'}
              </button>
            </form>
          </div>
        </div>
      )}

      {notices.length === 0 && !showForm && (
        <div className="app-card">
          <div className="empty-state">
            <i className="bi bi-megaphone" />
            <p>No notices yet. Post your first announcement.</p>
          </div>
        </div>
      )}

      <div className="d-flex flex-column gap-2">
        {notices.map((n) => {
          const p = PRIORITY[n.priority];
          return (
            <div key={n._id} className={`app-card ${!n.active ? 'opacity-50' : ''}`}
              style={{ borderLeft: `4px solid ${p.border}` }}>
              <div className="app-card-body" style={{ padding: '14px 20px' }}>
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div className="d-flex gap-3 align-items-start">
                    <div style={{ width: 36, height: 36, background: p.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.color, flexShrink: 0 }}>
                      <i className={`bi ${p.icon}`} />
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</span>
                        <span className="badge" style={{ background: p.bg, color: p.color, borderRadius: 6, fontSize: 11 }}>{p.label}</span>
                        {!n.active && <span className="badge bg-secondary" style={{ borderRadius: 6, fontSize: 11 }}>Hidden</span>}
                      </div>
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{n.body}</p>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => startEdit(n)} title="Edit"><i className="bi bi-pencil" /></button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => toggle(n)} title={n.active ? 'Hide' : 'Show'}>
                      <i className={`bi ${n.active ? 'bi-eye-slash' : 'bi-eye'}`} />
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => remove(n)} title="Delete"><i className="bi bi-trash" /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
