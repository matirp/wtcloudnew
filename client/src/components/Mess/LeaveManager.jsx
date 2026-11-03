import { useEffect, useState } from 'react';
import { leaveAPI } from '../../api/leaves';
import { customerAPI } from '../../api/customers';
import { MEAL_SLOTS, todayStr } from '../../utils/slot';

const STATUS_STYLE = {
  pending:  { bg: '#fffbeb', color: '#b45309', icon: 'bi-hourglass-split'  },
  approved: { bg: '#f0fdf4', color: '#16a34a', icon: 'bi-check-circle'      },
  rejected: { bg: '#fef2f2', color: '#ef4444', icon: 'bi-x-circle'          },
};

export default function LeaveManager() {
  const [leaves,    setLeaves]    = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filters,   setFilters]   = useState({ date: todayStr(), status: '' });
  const [form,      setForm]      = useState({ messId: '', date: todayStr(), mealSlot: 'Lunch', reason: '' });
  const [msg,       setMsg]       = useState({ text: '', type: 'success' });

  const load = async () => {
    const params = {};
    if (filters.date)   params.date   = filters.date;
    if (filters.status) params.status = filters.status;
    const [lRes, cRes] = await Promise.all([leaveAPI.list(params), customerAPI.list()]);
    setLeaves(lRes.data); setCustomers(cRes.data);
  };

  useEffect(() => { load(); }, [filters.date, filters.status]); // eslint-disable-line

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: 'success' }), 3000); };

  const apply = async (e) => {
    e.preventDefault();
    try {
      await leaveAPI.apply(form);
      setForm({ messId: '', date: todayStr(), mealSlot: 'Lunch', reason: '' });
      flash('Leave applied.'); load();
    } catch (err) { flash(err.response?.data?.message || 'Failed', 'danger'); }
  };

  const approve = async (id) => {
    try { await leaveAPI.approve(id); flash('Approved — 1 meal credit refunded.'); load(); }
    catch (err) { flash(err.response?.data?.message || 'Failed', 'danger'); }
  };

  const reject = async (id) => {
    try { await leaveAPI.reject(id); flash('Leave rejected.'); load(); }
    catch (err) { flash(err.response?.data?.message || 'Failed', 'danger'); }
  };

  const pending = leaves.filter((l) => l.status === 'pending').length;

  const SLOT_STYLE = { Breakfast: { bg: '#fffbeb', color: '#b45309' }, Lunch: { bg: '#eff6ff', color: '#1d4ed8' }, Dinner: { bg: '#f5f3ff', color: '#6d28d9' } };

  return (
    <>
      <div className="page-header">
        <h2>Leave Management</h2>
        <p>Apply and manage subscriber leave requests</p>
      </div>

      {msg.text && (
        <div className={`alert d-flex align-items-center gap-2 mb-3 alert-${msg.type}`} style={{ borderRadius: 10 }}>
          <i className={`bi ${msg.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'}`} /> {msg.text}
        </div>
      )}

      <div className="row g-3">
        {/* Apply form */}
        <div className="col-lg-4">
          <div className="app-card mb-3">
            <div className="app-card-header"><h5><i className="bi bi-calendar-plus me-2 text-primary" />Apply for Leave</h5></div>
            <div className="app-card-body">
              <form onSubmit={apply}>
                <div className="mb-3">
                  <label className="form-label">Subscriber</label>
                  <select className="form-select" value={form.messId} onChange={(e) => setForm({ ...form, messId: e.target.value })} required>
                    <option value="">— Select subscriber —</option>
                    {customers.filter((c) => c.active).map((c) => (
                      <option key={c._id} value={c.messId}>{c.messId} — {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="row g-2 mb-3">
                  <div className="col">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-control" value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                  </div>
                  <div className="col">
                    <label className="form-label">Meal</label>
                    <select className="form-select" value={form.mealSlot} onChange={(e) => setForm({ ...form, mealSlot: e.target.value })}>
                      {MEAL_SLOTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Reason (optional)</label>
                  <input className="form-control" placeholder="e.g. Going home for weekend"
                    value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  <i className="bi bi-send me-2" />Apply Leave
                </button>
              </form>
            </div>
          </div>

          <div className="app-card">
            <div className="app-card-body text-center">
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#64748b', marginBottom: 4 }}>Pending Approvals</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: pending > 0 ? '#f59e0b' : '#22c55e' }}>{pending}</div>
            </div>
          </div>
        </div>

        {/* Leave list */}
        <div className="col-lg-8">
          <div className="app-card">
            <div className="app-card-header">
              <h5><i className="bi bi-list-check me-2 text-primary" />Leave Requests</h5>
              <div className="d-flex gap-2">
                <input type="date" className="form-control form-control-sm" style={{ maxWidth: 160 }}
                  value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
                <select className="form-select form-select-sm" style={{ maxWidth: 140 }}
                  value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table app-table mb-0">
                <thead>
                  <tr><th>Mess ID</th><th>Date</th><th>Meal</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {leaves.length === 0 && (
                    <tr><td colSpan={6}><div className="empty-state" style={{ padding: '32px 0' }}><i className="bi bi-calendar-x" /><p>No leave requests found</p></div></td></tr>
                  )}
                  {leaves.map((l) => {
                    const ss = STATUS_STYLE[l.status];
                    const ms = SLOT_STYLE[l.mealSlot] || {};
                    return (
                      <tr key={l._id}>
                        <td><code>{l.messId}</code></td>
                        <td style={{ fontSize: 13 }}>{l.date}</td>
                        <td><span className="badge" style={{ background: ms.bg, color: ms.color, borderRadius: 6 }}>{l.mealSlot}</span></td>
                        <td style={{ fontSize: 13, color: '#64748b' }}>{l.reason || '—'}</td>
                        <td>
                          <span className="badge d-flex align-items-center gap-1" style={{ background: ss.bg, color: ss.color, borderRadius: 6, width: 'fit-content' }}>
                            <i className={`bi ${ss.icon}`} />{l.status}
                          </span>
                        </td>
                        <td>
                          {l.status === 'pending' ? (
                            <div className="d-flex gap-1">
                              <button className="btn btn-sm btn-outline-success" onClick={() => approve(l._id)}>
                                <i className="bi bi-check-lg" />
                              </button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => reject(l._id)}>
                                <i className="bi bi-x-lg" />
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>
                              {l.status === 'approved' ? '+1 meal refunded' : 'No refund'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
