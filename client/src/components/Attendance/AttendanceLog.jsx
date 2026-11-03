import { useEffect, useState } from 'react';
import { attendanceAPI } from '../../api/attendance';
import { MEAL_SLOTS, todayStr } from '../../utils/slot';

const SLOT_STYLE = {
  Breakfast: { bg: '#fffbeb', color: '#b45309' },
  Lunch:     { bg: '#eff6ff', color: '#1d4ed8' },
  Dinner:    { bg: '#f5f3ff', color: '#6d28d9' },
};

export default function AttendanceLog() {
  const [logs,    setLogs]    = useState([]);
  const [filters, setFilters] = useState({ date: todayStr(), mealSlot: '', messId: '' });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = async () => {
    setLoading(true);
    const params = {};
    if (filters.date)     params.date     = filters.date;
    if (filters.mealSlot) params.mealSlot = filters.mealSlot;
    if (filters.messId)   params.messId   = filters.messId;
    try {
      const res = await attendanceAPI.all(params);
      setLogs(res.data); setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters.date, filters.mealSlot, filters.messId]); // eslint-disable-line

  const onChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });
  const clear    = () => setFilters({ date: todayStr(), mealSlot: '', messId: '' });

  return (
    <>
      <div className="page-header">
        <h2>Attendance Log</h2>
        <p>Track all meal check-ins</p>
      </div>

      {/* Filters */}
      <div className="app-card mb-3">
        <div className="app-card-body d-flex flex-wrap gap-2 align-items-center" style={{ padding: '14px 20px' }}>
          <div className="input-group" style={{ maxWidth: 180 }}>
            <span className="input-group-text" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <i className="bi bi-calendar3 text-muted" />
            </span>
            <input type="date" className="form-control" name="date" value={filters.date} onChange={onChange} />
          </div>
          <select className="form-select" name="mealSlot" value={filters.mealSlot} onChange={onChange} style={{ maxWidth: 160 }}>
            <option value="">All meals</option>
            {MEAL_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="input-group" style={{ maxWidth: 180 }}>
            <span className="input-group-text" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <i className="bi bi-tag text-muted" />
            </span>
            <input className="form-control" placeholder="Mess ID" name="messId" value={filters.messId} onChange={onChange} />
          </div>
          <button className="btn btn-outline-secondary btn-sm" onClick={clear}>
            <i className="bi bi-x-circle me-1" />Clear
          </button>
          <span className="text-muted small ms-auto">{logs.length} records</span>
        </div>
      </div>

      {error && <div className="alert alert-danger d-flex gap-2 mb-3"><i className="bi bi-exclamation-circle" />{error}</div>}

      <div className="app-card">
        {loading ? (
          <div className="d-flex align-items-center justify-content-center p-5 text-muted gap-2">
            <div className="spinner-border spinner-border-sm" /> Loading…
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-check2-square" />
            <p>No attendance records match these filters</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table app-table mb-0">
              <thead>
                <tr>
                  <th>Date</th><th>Time</th><th>Mess ID</th><th>Name</th><th>Meal</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const s = SLOT_STYLE[l.mealSlot] || {};
                  return (
                    <tr key={l._id}>
                      <td className="text-muted" style={{ fontSize: 13 }}>{l.date}</td>
                      <td className="text-muted" style={{ fontSize: 13 }}>{new Date(l.timestamp).toLocaleTimeString()}</td>
                      <td><code>{l.messId}</code></td>
                      <td style={{ fontWeight: 500 }}>{l.name}</td>
                      <td>
                        <span className="badge" style={{ background: s.bg, color: s.color, borderRadius: 6 }}>{l.mealSlot}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
