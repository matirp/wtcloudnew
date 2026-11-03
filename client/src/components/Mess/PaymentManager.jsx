import { useEffect, useState } from 'react';
import { paymentAPI } from '../../api/payments';
import { customerAPI } from '../../api/customers';

const PAY_COLOR = { Paid: '#16a34a', Pending: '#ef4444', Partial: '#b45309' };
const PAY_BG    = { Paid: '#f0fdf4', Pending: '#fef2f2', Partial: '#fffbeb' };

export default function PaymentManager() {
  const [summary,   setSummary]   = useState([]);
  const [payments,  setPayments]  = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState('');
  const [form,      setForm]      = useState({ messId: '', amount: '', method: 'Cash', note: '' });
  const [msg,       setMsg]       = useState({ text: '', type: 'success' });
  const [saving,    setSaving]    = useState(false);

  const load = async () => {
    const [sRes, cRes] = await Promise.all([paymentAPI.summary(), customerAPI.list()]);
    setSummary(sRes.data); setCustomers(cRes.data);
  };

  const loadHistory = async (messId) => {
    setSelected(messId);
    const res = await paymentAPI.list({ messId });
    setPayments(res.data);
  };

  useEffect(() => { load(); }, []);

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: 'success' }), 3000); };

  const recordPayment = async (e) => {
    e.preventDefault();
    if (!form.messId || !form.amount) { flash('Mess ID and amount are required.', 'danger'); return; }
    setSaving(true);
    try {
      const res = await paymentAPI.record(form);
      flash(`Rs.${form.amount} recorded. Status: ${res.data.customer.paymentStatus}`);
      setForm({ messId: '', amount: '', method: 'Cash', note: '' });
      load();
      if (selected === form.messId.toUpperCase()) loadHistory(selected);
    } catch (err) { flash(err.response?.data?.message || 'Failed', 'danger'); }
    finally { setSaving(false); }
  };

  const deletePayment = async (id) => {
    await paymentAPI.delete(id);
    if (selected) loadHistory(selected);
    flash('Payment deleted.'); load();
  };

  const visible = summary.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.messId.includes(search.toUpperCase())
  );

  const totalCollected = summary.reduce((s, c) => s + c.paid, 0);
  const totalDue       = summary.reduce((s, c) => s + c.due,  0);

  return (
    <>
      <div className="page-header">
        <h2>Payment Manager</h2>
        <p>Record and track subscriber payments</p>
      </div>

      {msg.text && (
        <div className={`alert d-flex align-items-center gap-2 mb-3 alert-${msg.type}`} style={{ borderRadius: 10 }}>
          <i className={`bi ${msg.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'}`} /> {msg.text}
        </div>
      )}

      {/* Summary row */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Collected',    value: `Rs.${totalCollected.toLocaleString()}`, icon: 'bi-wallet2',              bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Total Outstanding',  value: `Rs.${totalDue.toLocaleString()}`,       icon: 'bi-exclamation-circle',   bg: '#fef2f2', color: '#ef4444' },
          { label: 'Pending Subscribers',value: summary.filter((c) => c.due > 0).length,icon: 'bi-people',               bg: '#fffbeb', color: '#b45309' },
        ].map((s) => (
          <div key={s.label} className="col-md-4">
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: s.bg, color: s.color }}><i className={`bi ${s.icon}`} /></div>
              <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        {/* Record form */}
        <div className="col-lg-4">
          <div className="app-card">
            <div className="app-card-header"><h5><i className="bi bi-plus-circle me-2 text-primary" />Record Payment</h5></div>
            <div className="app-card-body">
              <form onSubmit={recordPayment}>
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
                    <label className="form-label">Amount (Rs.)</label>
                    <input type="number" min="1" className="form-control" placeholder="0"
                      value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                  </div>
                  <div className="col">
                    <label className="form-label">Method</label>
                    <select className="form-select" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                      <option>Cash</option><option>UPI</option><option>Card</option><option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Note (optional)</label>
                  <input className="form-control" placeholder="e.g. November fees"
                    value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                  <i className="bi bi-save me-2" />{saving ? 'Recording…' : 'Record Payment'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Summary table */}
        <div className="col-lg-8">
          <div className="app-card mb-3">
            <div className="app-card-header">
              <h5><i className="bi bi-table me-2 text-primary" />Payment Summary</h5>
              <div className="input-group" style={{ maxWidth: 220 }}>
                <span className="input-group-text" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <i className="bi bi-search text-muted" />
                </span>
                <input className="form-control form-control-sm" placeholder="Search…"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="table-responsive">
              <table className="table app-table mb-0">
                <thead>
                  <tr><th>Mess ID</th><th>Name</th><th>Plan</th><th>Paid</th><th>Due</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {visible.map((c) => (
                    <tr key={c.messId}>
                      <td><code>{c.messId}</code></td>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td style={{ fontSize: 13 }}>{c.planType}</td>
                      <td style={{ fontWeight: 600, color: '#16a34a', fontSize: 13 }}>Rs.{c.paid}</td>
                      <td style={{ fontWeight: c.due > 0 ? 600 : 400, color: c.due > 0 ? '#ef4444' : '#94a3b8', fontSize: 13 }}>Rs.{c.due}</td>
                      <td>
                        <span className="badge" style={{ background: PAY_BG[c.paymentStatus], color: PAY_COLOR[c.paymentStatus], borderRadius: 6 }}>
                          {c.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => loadHistory(c.messId)}>
                          <i className="bi bi-clock-history" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && <tr><td colSpan={7}><div className="empty-state" style={{ padding: '32px 0' }}><i className="bi bi-wallet2" /><p>No records found</p></div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transaction history */}
          {selected && (
            <div className="app-card">
              <div className="app-card-header">
                <h5><i className="bi bi-receipt me-2 text-primary" />Transactions — {selected}</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelected('')}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
              <div className="table-responsive">
                <table className="table app-table mb-0">
                  <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Note</th><th></th></tr></thead>
                  <tbody>
                    {payments.length === 0 && <tr><td colSpan={5} className="text-center text-muted p-4">No payments recorded.</td></tr>}
                    {payments.map((p) => (
                      <tr key={p._id}>
                        <td style={{ fontSize: 13 }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 600, color: '#16a34a' }}>Rs.{p.amount}</td>
                        <td style={{ fontSize: 13 }}>{p.method}</td>
                        <td style={{ fontSize: 13, color: '#64748b' }}>{p.note || '—'}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => deletePayment(p._id)}>
                            <i className="bi bi-trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
