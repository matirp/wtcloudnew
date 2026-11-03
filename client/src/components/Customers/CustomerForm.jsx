import { useState, useEffect } from 'react';
import { Form, Button, Card, Alert, Container, Row, Col } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { customerAPI } from '../../api/customers';
import { validators, validateForm } from '../../utils/validation';
import { PLAN_NAMES, PLAN_DETAILS, formatDate } from '../../utils/slot';
import FaceCapture from '../Scanner/FaceCapture';

// Add (no :id) or Edit (:id) a customer (admin only).
export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    planType: 'Full Board',
    paymentStatus: 'Pending',
    active: true,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [hasFace, setHasFace] = useState(false);
  const [showFace, setShowFace] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await customerAPI.get(id);
        const c = res.data;
        setForm({
          name: c.name,
          email: c.email,
          phone: c.phone,
          planType: c.planType,
          paymentStatus: c.paymentStatus,
          active: c.active,
        });
        setHasFace(Array.isArray(c.faceDescriptor) && c.faceDescriptor.length === 128);
      } catch (err) {
        setServerError(err.response?.data?.message || 'Could not load customer');
      }
    })();
  }, [id, isEdit]);

  const plan = PLAN_DETAILS[form.planType];
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm(form, ['name', 'email', 'phone']);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setServerError('');
    try {
      if (isEdit) {
        await customerAPI.update(id, form);
        if (faceDescriptor) {
          await customerAPI.setFace(id, faceDescriptor);
        }
      } else {
        // Don't send faceDescriptor at all if none was captured
        const payload = { ...form };
        if (faceDescriptor) payload.faceDescriptor = faceDescriptor;
        const res = await customerAPI.create(payload);
        if (faceDescriptor && res.data._id) {
          await customerAPI.setFace(res.data._id, faceDescriptor);
        }
      }
      navigate('/customers');
    } catch (err) {
      // Show the real server validation message when available
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.join(', ') ||
        err.message ||
        'Save failed';
      setServerError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h2>{isEdit ? 'Edit Customer' : 'Add Customer'}</h2>
        <p>{isEdit ? 'Update subscriber details' : 'Register a new mess subscriber'}</p>
      </div>

      <div className="app-card">
        <div className="app-card-body">
          {serverError && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
              <i className="bi bi-exclamation-circle" /> {serverError}
            </div>
          )}
          <Form onSubmit={onSubmit} noValidate>
            <Row>
              <Form.Group as={Col} className="mb-3" md={6}>
                <Form.Label>Full Name</Form.Label>
                <Form.Control name="name" value={form.name} onChange={onChange} isInvalid={!!errors.name} />
                <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group as={Col} className="mb-3" md={6}>
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" name="email" value={form.email} onChange={onChange} isInvalid={!!errors.email} />
                <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
              </Form.Group>
            </Row>
            <Row>
              <Form.Group as={Col} className="mb-3" md={6}>
                <Form.Label>Phone (10 digits)</Form.Label>
                <Form.Control name="phone" value={form.phone} onChange={onChange} isInvalid={!!errors.phone} />
                <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group as={Col} className="mb-3" md={6}>
                <Form.Label>Plan Type</Form.Label>
                <Form.Select name="planType" value={form.planType} onChange={onChange}>
                  {PLAN_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
                </Form.Select>
              </Form.Group>
            </Row>
            <Row>
              <Form.Group as={Col} className="mb-3" md={6}>
                <Form.Label>Payment Status</Form.Label>
                <Form.Select name="paymentStatus" value={form.paymentStatus} onChange={onChange}>
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                </Form.Select>
              </Form.Group>
              <Form.Group as={Col} className="mb-3" md={6}>
                <Form.Label>&nbsp;</Form.Label>
                <div className="mt-2">
                  <Form.Check type="checkbox" name="active" label="Active" checked={form.active} onChange={onChange} />
                </div>
              </Form.Group>
            </Row>

            <div className="rounded-3 p-3 mb-3" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 14 }}>
              <i className="bi bi-info-circle me-2 text-primary" />
              <strong>{plan.totalMeals} meals</strong> · 30-day validity · Slots: {plan.slots.join(', ')}
              {isEdit && <span className="text-muted"> · Changing the plan resets meals &amp; validity.</span>}
            </div>

            {isEdit && (
              <div className="mb-3">
                <Form.Check type="checkbox" label={hasFace ? 'Update face enrollment' : 'Enroll face for scanning'}
                  checked={showFace} onChange={(e) => setShowFace(e.target.checked)} />
                {hasFace && !showFace && <div className="text-success small mt-1"><i className="bi bi-check-circle me-1" />Face already enrolled.</div>}
                {showFace && <div className="mt-2"><FaceCapture onCapture={setFaceDescriptor} initialCaptured={hasFace} /></div>}
              </div>
            )}
            {!isEdit && (
              <div className="mb-3">
                <Form.Check type="checkbox" label="Enroll face for scanning (optional)"
                  checked={showFace} onChange={(e) => setShowFace(e.target.checked)} />
                {showFace && <div className="mt-2"><FaceCapture onCapture={setFaceDescriptor} /></div>}
              </div>
            )}

            <div className="d-flex gap-2 mt-4">
              <Button type="submit" variant="primary" disabled={saving}>
                <i className={`bi ${saving ? 'bi-hourglass-split' : isEdit ? 'bi-save' : 'bi-person-plus'} me-2`} />
                {saving ? 'Saving…' : isEdit ? 'Update Customer' : 'Create Customer'}
              </Button>
              <Button variant="outline-secondary" onClick={() => navigate('/customers')}>Cancel</Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
