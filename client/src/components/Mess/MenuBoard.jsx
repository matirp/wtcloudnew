import { useEffect, useState } from 'react';
import { menuAPI } from '../../api/menu';
import { todayStr } from '../../utils/slot';

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', icon: 'bi-brightness-high', bg: '#fffbeb', color: '#b45309', time: '7:30 – 9:30 AM'  },
  { key: 'lunch',     label: 'Lunch',     icon: 'bi-sun',             bg: '#eff6ff', color: '#1d4ed8', time: '12:30 – 2:30 PM' },
  { key: 'dinner',    label: 'Dinner',    icon: 'bi-moon-stars',      bg: '#f5f3ff', color: '#6d28d9', time: '7:00 – 9:00 PM'  },
];

export default function MenuBoard() {
  const [menu,    setMenu]    = useState({ date: todayStr(), breakfast: '', lunch: '', dinner: '' });
  const [week,    setWeek]    = useState([]);
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({});
  const [msg,     setMsg]     = useState('');
  const [saving,  setSaving]  = useState(false);

  const load = async () => {
    const [mRes, wRes] = await Promise.all([menuAPI.get(), menuAPI.week()]);
    setMenu(mRes.data);
    setWeek(wRes.data);
    setForm({ breakfast: mRes.data.breakfast, lunch: mRes.data.lunch, dinner: mRes.data.dinner });
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await menuAPI.save({ ...form, date: todayStr() });
      setMenu(res.data); setEditing(false);
      setMsg('Menu saved.'); setTimeout(() => setMsg(''), 2500);
      load();
    } catch (err) { setMsg('Save failed: ' + (err.response?.data?.message || err.message)); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="page-header d-flex align-items-center justify-content-between">
        <div>
          <h2>Meal Menu</h2>
          <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setEditing(!editing)}>
          <i className={`bi ${editing ? 'bi-x-lg' : 'bi-pencil'}`} />
          {editing ? 'Cancel' : "Edit Today's Menu"}
        </button>
      </div>

      {msg && (
        <div className="alert d-flex align-items-center gap-2 mb-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, color: '#15803d' }}>
          <i className="bi bi-check-circle-fill" /> {msg}
        </div>
      )}

      {/* Today */}
      <div className="app-card mb-4">
        <div className="app-card-header">
          <h5><i className="bi bi-journal-check me-2 text-primary" />Today's Menu</h5>
        </div>
        <div className="app-card-body">
          {editing ? (
            <form onSubmit={save}>
              {MEALS.map((m) => (
                <div key={m.key} className="mb-3">
                  <label className="form-label d-flex align-items-center gap-2">
                    <span style={{ width: 28, height: 28, background: m.bg, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: m.color }}>
                      <i className={`bi ${m.icon}`} />
                    </span>
                    {m.label}
                  </label>
                  <textarea className="form-control" rows={2}
                    placeholder={`Items for ${m.label} (comma-separated)…`}
                    value={form[m.key] || ''} onChange={(e) => setForm({ ...form, [m.key]: e.target.value })} />
                </div>
              ))}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <i className="bi bi-save me-2" />{saving ? 'Saving…' : 'Save Menu'}
              </button>
            </form>
          ) : (
            <div className="row g-3">
              {MEALS.map((m) => (
                <div key={m.key} className="col-md-4">
                  <div className="rounded-3 p-3 h-100" style={{ border: `1px solid ${m.bg}`, background: `${m.bg}55` }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div style={{ width: 32, height: 32, background: m.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color }}>
                        <i className={`bi ${m.icon}`} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: m.color }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{m.time}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                      {menu[m.key] || <span className="text-muted fst-italic">Not set</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Week */}
      <div className="app-card">
        <div className="app-card-header">
          <h5><i className="bi bi-calendar-week me-2 text-primary" />This Week</h5>
        </div>
        <div className="table-responsive">
          <table className="table app-table mb-0">
            <thead>
              <tr>
                <th>Day</th>
                <th><i className="bi bi-brightness-high me-1" />Breakfast</th>
                <th><i className="bi bi-sun me-1" />Lunch</th>
                <th><i className="bi bi-moon-stars me-1" />Dinner</th>
              </tr>
            </thead>
            <tbody>
              {week.map((d) => {
                const isToday = d.date === todayStr();
                return (
                  <tr key={d.date} style={isToday ? { background: '#eff6ff' } : {}}>
                    <td>
                      <span style={{ fontWeight: isToday ? 700 : 500 }}>
                        {new Date(d.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      {isToday && <span className="badge ms-2" style={{ background: '#3b82f6', color: '#fff', borderRadius: 6, fontSize: 11 }}>Today</span>}
                    </td>
                    <td style={{ fontSize: 13 }}>{d.breakfast || <span className="text-muted">—</span>}</td>
                    <td style={{ fontSize: 13 }}>{d.lunch     || <span className="text-muted">—</span>}</td>
                    <td style={{ fontSize: 13 }}>{d.dinner    || <span className="text-muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
