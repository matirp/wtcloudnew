import { useEffect, useState } from 'react';
import { Button, Modal, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { customerAPI } from '../../api/customers';
import { formatDate, isExpired } from '../../utils/slot';

const PAY_COLOR  = { Paid: '#22c55e', Pending: '#ef4444', Partial: '#f59e0b' };
const PAY_BG     = { Paid: '#f0fdf4', Pending: '#fef2f2', Partial: '#fffbeb' };

export default function CustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [confirm,   setConfirm]   = useState(null);
  const [toast,     setToast]     = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await customerAPI.list({ search: search || undefined });
      setCustomers(res.data); setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]); // eslint-disable-line

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const onRenew = async (c) => {
    try { await customerAPI.renew(c._id); flash(`${c.name}'s subscription renewed.`); load(); }
    catch (err) { setError(err.response?.data?.message || 'Renewal failed'); }
  };

  const onToggle = async (c) => {
    try {
      c.active ? await customerAPI.deactivate(c._id) : await customerAPI.reactivate(c._id);
      load();
    } catch (err) { setError(err.response?.data?.message || 'Action failed'); }
  };

  const onHardDelete = async (c) => {
    try { await customerAPI.deleteHard(c._id); setConfirm(null); load(); }
    catch (err) { setError(err.response?.data?.message || 'Delete failed'); }
  };

  const visible = customers.filter((c) => {
    if (!filter) return true;
    if (filter === 'active')   return c.active;
    if (filter === 'inactive') return !c.active;
    if (filter === 'expired')  return isExpired(c.validityDate);
    return c.paymentStatus === filter;
  });

  return (
    <>
      <div className="page-header d-flex align-items-center justify-content-between">
        <div>
          <h2>Customers</h2>
          <p>Manage all mess subscribers</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => navigate('/customers/new')}>
          <i className="bi bi-person-plus" /> Add Customer
        </button>
      </div>

      {/* Toasts / errors */}
      {toast && (
        <div className="alert d-flex align-items-center gap-2 mb-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, color: '#15803d' }}>
          <i className="bi bi-check-circle-fill" /> {toast}
        </div>
      )}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
          <i className="bi bi-exclamation-circle" /> {error}
        </div>
      )}

      {/* Filters */}
      <div className="app-card mb-3">
        <div className="app-card-body d-flex flex-wrap gap-2" style={{ padding: '14px 20px' }}>
          <div className="input-group" style={{ maxWidth: 300 }}>
            <span className="input-group-text" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <i className="bi bi-search text-muted" />
            </span>
            <input className="form-control" placeholder="Search name, ID, email…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ maxWidth: 200 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All subscribers</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
            <option value="Paid">Payment: Paid</option>
            <option value="Pending">Payment: Pending</option>
            <option value="Partial">Payment: Partial</option>
          </select>
          <span className="text-muted small align-self-center ms-auto">
            {visible.length} of {customers.length} subscribers
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="app-card">
        {loading ? (
          <div className="d-flex align-items-center justify-content-center p-5 text-muted gap-2">
            <div className="spinner-border spinner-border-sm" /> Loading…
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table app-table mb-0">
              <thead>
                <tr>
                  <th>Mess ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Plan</th>
                  <th>Valid Until</th>
                  <th>Meals</th>
                  <th>Payment</th>
                  <th>Face</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={10}>
                      <div className="empty-state">
                        <i className="bi bi-people" />
                        <p>No customers found</p>
                      </div>
                    </td>
                  </tr>
                )}
                {visible.map((c) => {
                  const expired = isExpired(c.validityDate);
                  const hasFace = Array.isArray(c.faceDescriptor) && c.faceDescriptor.length === 128;
                  return (
                    <tr key={c._id}>
                      <td><code>{c.messId}</code></td>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td className="text-muted">{c.phone}</td>
                      <td style={{ fontSize: 13 }}>{c.planType}</td>
                      <td style={{ fontSize: 13 }}>
                        {formatDate(c.validityDate)}
                        {expired && <span className="ms-1 badge" style={{ background: '#fef2f2', color: '#ef4444', borderRadius: 6 }}>Expired</span>}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: c.mealsRemaining <= 5 ? '#ef4444' : '#0f172a' }}>
                          {c.mealsRemaining}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: PAY_BG[c.paymentStatus], color: PAY_COLOR[c.paymentStatus], borderRadius: 6 }}>
                          {c.paymentStatus}
                        </span>
                      </td>
                      <td>
                        {hasFace
                          ? <span style={{ color: '#22c55e' }}><i className="bi bi-person-check-fill" /></span>
                          : <span style={{ color: '#94a3b8' }}><i className="bi bi-person-x" /></span>}
                      </td>
                      <td>
                        {c.active
                          ? <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 6 }}>Active</span>
                          : <span className="badge" style={{ background: '#f8fafc', color: '#64748b', borderRadius: 6 }}>Inactive</span>}
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/customers/${c._id}/edit`)} title="Edit">
                            <i className="bi bi-pencil" />
                          </button>
                          <button className="btn btn-sm btn-outline-success" onClick={() => onRenew(c)} title="Renew subscription">
                            <i className="bi bi-arrow-clockwise" />
                          </button>
                          <button className={`btn btn-sm ${c.active ? 'btn-outline-warning' : 'btn-outline-secondary'}`} onClick={() => onToggle(c)}
                            title={c.active ? 'Deactivate' : 'Reactivate'}>
                            <i className={`bi ${c.active ? 'bi-pause-circle' : 'bi-play-circle'}`} />
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirm(c)} title="Delete">
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <Modal show={!!confirm} onHide={() => setConfirm(null)} centered>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f1f5f9' }}>
          <Modal.Title style={{ fontSize: 16 }}>Delete Customer</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: 14 }}>
          <div className="d-flex align-items-center gap-3 mb-3">
            <div style={{ width: 44, height: 44, background: '#fef2f2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bi bi-trash text-danger" style={{ fontSize: 20 }} />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{confirm?.name}</div>
              <code>{confirm?.messId}</code>
            </div>
          </div>
          This action is permanent and cannot be undone. Attendance history will be preserved.
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #f1f5f9' }}>
          <Button variant="outline-secondary" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => onHardDelete(confirm)}>Delete Permanently</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
