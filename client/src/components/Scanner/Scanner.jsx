import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Card, Button, Form, Alert, Row, Col,
  Badge, InputGroup, Container, Spinner, ProgressBar, Tab, Tabs,
} from 'react-bootstrap';
import { customerAPI } from '../../api/customers';
import { attendanceAPI } from '../../api/attendance';
import {
  loadModels, detectFaceFull, detectFromImage,
  matchDescriptor, drawDetection, captureAveragedDescriptor,
} from './faceApi';
import FaceOverlay from './FaceOverlay';
import { getMealSlot, allowedSlots, MEAL_SLOTS, formatDate, isExpired } from '../../utils/slot';

const STATUS_VARIANT = { Paid: 'success', Pending: 'warning', Partial: 'info' };

export default function Scanner() {
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const streamRef    = useRef(null);
  const matchRef     = useRef(null);   // matching interval (stops after match)
  const trackRef     = useRef(null);   // tracking interval (runs continuously)
  const enrolledRef  = useRef([]);
  const photoFileRef = useRef(null);
  const matchCustomerRef = useRef(null); // mirror of matchCustomer for use inside intervals

  // ── general state ──────────────────────────────────────────────────────────
  const [modelStatus,   setModelStatus]   = useState('loading');
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [cameraOn,      setCameraOn]      = useState(false);
  const [scanning,      setScanning]      = useState(false);
  const [statusMsg,     setStatusMsg]     = useState('');
  const [debugLine,     setDebugLine]     = useState('');
  const [warnings,      setWarnings]      = useState([]);

  // ── identified customer + check-in ────────────────────────────────────────
  const [matchCustomer, setMatchCustomer] = useState(null);
  const [manualId,      setManualId]      = useState('');
  const [mealSlot,      setMealSlot]      = useState(getMealSlot() || 'Breakfast');
  const [checkinMsg,    setCheckinMsg]    = useState('');
  const [checkinError,  setCheckinError]  = useState('');

  // ── re-enroll ──────────────────────────────────────────────────────────────
  const [reEnrolling,     setReEnrolling]     = useState(false);
  const [reEnrollMsg,     setReEnrollMsg]     = useState('');
  const [reEnrollTarget,  setReEnrollTarget]  = useState(null);
  const [captureProgress, setCaptureProgress] = useState(0);

  // ── photo match ────────────────────────────────────────────────────────────
  const [photoFile,     setPhotoFile]     = useState(null);
  const [photoPreview,  setPhotoPreview]  = useState(null);
  const [photoMsg,      setPhotoMsg]      = useState('');
  const [photoMatching, setPhotoMatching] = useState(false);

  const warn = (msg) => setWarnings((w) => (w.includes(msg) ? w : [...w, msg]));

  // ── camera helpers ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraOn(true);
      }
    } catch (err) {
      warn('Webcam: ' + err.message + '. Use Photo Match or Manual ID Lookup.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (matchRef.current)  { clearInterval(matchRef.current);  matchRef.current  = null; }
    if (trackRef.current)  { clearInterval(trackRef.current);  trackRef.current  = null; }
    setScanning(false);
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setCameraOn(false);
    if (canvasRef.current) canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, []);

  const loadEnrolled = async () => {
    const res = await customerAPI.faces();
    enrolledRef.current = res.data;
    setEnrolledCount(res.data.length);
    return res.data;
  };

  // ── mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatusMsg('Loading face recognition models…');
      try {
        await loadModels();
        if (cancelled) return;
        setModelStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setModelStatus('error');
        warn('Models failed to load — check client/public/models/. Photo match & manual lookup still work.');
      }
      try {
        const data = await loadEnrolled();
        if (!cancelled) setStatusMsg(data.length > 0
          ? `Ready — ${data.length} enrolled face(s). Click ▶ Start Scanning.`
          : 'Ready — no enrolled faces yet. Enroll via Customers → Edit.');
      } catch { if (!cancelled) warn('Could not load enrolled faces.'); }
      if (!cancelled) await startCamera();
    })();
    return () => { cancelled = true; stopCamera(); };
  }, []); // eslint-disable-line

  // ── overlay ────────────────────────────────────────────────────────────────
  const drawOverlay = useCallback((result, label, color) => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    const rect = video.getBoundingClientRect();
    canvas.width  = rect.width  || video.videoWidth  || 640;
    canvas.height = rect.height || video.videoHeight || 480;
    drawDetection(canvas, result, label, color);
  }, []);

  // ── live scanning loop ─────────────────────────────────────────────────────
  // Two loops run in parallel:
  //   trackRef  — 200ms: always draws the detection box so it follows the face
  //   matchRef  — 700ms: attempts recognition until a match is found, then stops
  const startScanning = () => {
    if (modelStatus !== 'ready') { warn('Models not ready yet.'); return; }
    if (!cameraOn) { warn('Camera not available. Use Photo Match or Manual ID Lookup.'); return; }
    setWarnings([]); setCheckinMsg(''); setCheckinError('');
    setScanning(true);
    setStatusMsg('Scanning… look directly at the camera.');

    // ── Tracking loop (fast — just draws the box) ──────────────────────────
    trackRef.current = setInterval(async () => {
      try {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;
        const result = await detectFaceFull(video);
        // Keep drawing even after a match so the box keeps following the face.
        // Color: green after match, yellow while searching.
        const isMatched = !!matchCustomerRef.current;
        drawOverlay(result, isMatched ? matchCustomerRef.current.name : null, isMatched ? '#28a745' : '#ffc107');
      } catch { /* ignore per-frame errors */ }
    }, 200);

    // ── Matching loop (slower — does recognition) ──────────────────────────
    matchRef.current = setInterval(async () => {
      try {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;

        const result = await detectFaceFull(video);
        if (!result) {
          setDebugLine('No face detected');
          setStatusMsg('👁 No face detected — look directly at the camera.');
          return;
        }

        setDebugLine(`face score=${result.detection?.score?.toFixed(3)}`);

        const customers = enrolledRef.current;
        if (customers.length === 0) {
          setStatusMsg('Face detected but no enrolled faces. Click ↺ Refresh.');
          return;
        }

        let m;
        try { m = matchDescriptor(customers, result.descriptor); }
        catch (e) { setDebugLine('match error: ' + e.message); return; }

        const distStr = m.distance.toFixed(3);
        setDebugLine(`matched=${m.matched} dist=${distStr} closest="${m.closest}"`);

        if (!m.matched) {
          setStatusMsg(`😐 Face detected — closest: "${m.closest}" dist=${distStr} (need ≤0.60). Re-enroll or improve lighting.`);
          return;
        }

        // ✅ Match found — stop the matching loop but keep tracking loop alive
        clearInterval(matchRef.current); matchRef.current = null;
        setScanning(false);

        const res = await customerAPI.byMess(m.messId);
        applyMatch(res.data);
        setStatusMsg(`✅ Matched: ${res.data.name} (distance ${distStr})`);
      } catch (frameErr) { setDebugLine('frame error: ' + frameErr.message); }
    }, 700);
  };

  const stopScanning = () => {
    if (matchRef.current) { clearInterval(matchRef.current); matchRef.current = null; }
    if (trackRef.current) { clearInterval(trackRef.current); trackRef.current = null; }
    setScanning(false);
    drawOverlay(null, null);
    setStatusMsg('Scanning stopped.');
  };

  // Helper: set identified customer state from any match source
  const applyMatch = (customer) => {
    matchCustomerRef.current = customer;
    setMatchCustomer(customer);
    setReEnrollTarget(customer);
    const auto    = getMealSlot();
    const allowed = allowedSlots(customer.planType);
    setMealSlot(auto && allowed.includes(auto) ? auto : allowed[0] || 'Breakfast');
  };

  // ── photo match ────────────────────────────────────────────────────────────
  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoMsg('');
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const matchFromPhoto = async () => {
    if (!photoFile) { setPhotoMsg('Please select a photo first.'); return; }
    setPhotoMatching(true);
    setPhotoMsg('Detecting face in photo…');
    setCheckinMsg(''); setCheckinError('');
    try {
      await loadModels();
      const result = await detectFromImage(photoFile);
      if (!result) {
        setPhotoMsg('❌ No face detected. Use a clear, front-facing, well-lit photo.');
        setPhotoMatching(false);
        return;
      }
      const customers = enrolledRef.current;
      if (customers.length === 0) {
        setPhotoMsg('❌ No enrolled faces. Enroll a customer first via Customers → Edit.');
        setPhotoMatching(false);
        return;
      }
      const m = matchDescriptor(customers, result.descriptor);
      const distStr = m.distance.toFixed(3);
      if (!m.matched) {
        setPhotoMsg(`😐 No match — closest: "${m.closest}" dist=${distStr} (need ≤0.60). Try re-enrolling with a similar photo.`);
        setPhotoMatching(false);
        return;
      }
      const res = await customerAPI.byMess(m.messId);
      applyMatch(res.data);
      setPhotoMsg(`✅ Matched: ${res.data.name} (distance ${distStr})`);
    } catch (err) {
      setPhotoMsg('❌ Error: ' + err.message);
    } finally {
      setPhotoMatching(false);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null); setPhotoPreview(null); setPhotoMsg('');
    if (photoFileRef.current) photoFileRef.current.value = '';
  };

  // ── manual ID lookup ───────────────────────────────────────────────────────
  const manualLookup = async (e) => {
    e?.preventDefault();
    setCheckinMsg(''); setCheckinError('');
    if (!manualId.trim()) return;
    try {
      const res = await customerAPI.byMess(manualId.trim().toUpperCase());
      applyMatch(res.data);
      setStatusMsg(`Loaded: ${res.data.name}`);
    } catch (err) {
      warn(err.response?.data?.message || 'Customer not found');
      setMatchCustomer(null);
    }
  };

  // ── re-enroll ──────────────────────────────────────────────────────────────
  const doReEnroll = async (customer) => {
    if (!cameraOn) { warn('Camera needed for re-enrollment.'); return; }
    setReEnrolling(true); setReEnrollMsg(''); setCaptureProgress(0);
    // Stop matching loop only — keep tracking loop so the box keeps showing
    if (matchRef.current) { clearInterval(matchRef.current); matchRef.current = null; }
    setScanning(false);
    try {
      setReEnrollMsg('Hold still — capturing 5 frames…');
      const prog = setInterval(() => setCaptureProgress((p) => Math.min(p + 20, 95)), 350);
      const result = await captureAveragedDescriptor(videoRef.current, 5, 350);
      clearInterval(prog); setCaptureProgress(100);
      if (!result) {
        setReEnrollMsg('❌ No face detected. Make sure your face is visible and well-lit.');
        return;
      }
      await customerAPI.setFace(customer._id, Array.from(result.descriptor));
      await loadEnrolled();
      setReEnrollMsg(`✅ Re-enrolled ${customer.name} (${result.framesUsed} frames). Try scanning again.`);
    } catch (err) {
      setReEnrollMsg('❌ Re-enrollment failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setReEnrolling(false); setCaptureProgress(0);
    }
  };

  // ── check-in ───────────────────────────────────────────────────────────────
  const doCheckin = async () => {
    setCheckinMsg(''); setCheckinError('');
    try {
      const res = await attendanceAPI.checkin(matchCustomer.messId, mealSlot);
      setMatchCustomer(res.data.customer);
      setCheckinMsg(`✓ Checked in — ${mealSlot} for ${res.data.customer.name}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Check-in failed';
      if (err.response?.status === 409) setCheckinMsg(`ℹ ${msg}`);
      else setCheckinError(msg);
    }
  };

  const clearMatch = () => {
    matchCustomerRef.current = null;
    setMatchCustomer(null); setCheckinMsg(''); setCheckinError('');
    setReEnrollTarget(null); setReEnrollMsg('');
    // Don't clear the overlay — tracking loop keeps drawing
  };

  const canScan = modelStatus === 'ready' && cameraOn;
  const slots   = matchCustomer ? allowedSlots(matchCustomer.planType) : MEAL_SLOTS;

  return (
    <Container fluid="xxl">
      {/* ── Header ── */}
      <div className="page-header d-flex align-items-center justify-content-between">
        <div>
          <h2>Face Scanner</h2>
          <p>Identify subscribers by face or Mess ID</p>
        </div>
        <div className="d-flex align-items-center gap-3">
          {modelStatus === 'loading' && (
            <span className="text-muted small d-flex align-items-center gap-2">
              <div className="spinner-border spinner-border-sm" /> Loading models…
            </span>
          )}
          {modelStatus === 'ready' && (
            <span className="badge d-flex align-items-center gap-1"
              style={{ background: enrolledCount > 0 ? '#f0fdf4' : '#fffbeb', color: enrolledCount > 0 ? '#16a34a' : '#b45309', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}>
              <i className="bi bi-person-bounding-box" /> {enrolledCount} enrolled
            </span>
          )}
          {modelStatus === 'error' && (
            <span className="badge" style={{ background: '#fef2f2', color: '#ef4444', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}>
              <i className="bi bi-exclamation-triangle me-1" />Models not loaded
            </span>
          )}
          <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={async () => { const d = await loadEnrolled(); setStatusMsg(`Refreshed — ${d.length} enrolled face(s).`); }}>
            <i className="bi bi-arrow-clockwise" /> Refresh
          </button>
        </div>
      </div>

      {warnings.map((w, i) => (
        <Alert key={i} variant="warning" dismissible onClose={() => setWarnings((ws) => ws.filter((_, j) => j !== i))}>
          {w}
        </Alert>
      ))}

      <Row className="g-3">
        {/* ── Left column ── */}
        <Col lg={7}>
          <Card className="shadow-sm">
            <Card.Body>
              <Tabs defaultActiveKey="live" className="mb-3">

                {/* Live Webcam tab */}
                <Tab eventKey="live" title={<><i className="bi bi-camera-video me-1" />Live Webcam</>}>
                  <div style={{ position: 'relative', background: '#111', borderRadius: 8, overflow: 'hidden' }}>
                    <video
                      ref={videoRef}
                      style={{ display: 'block', width: '100%', maxHeight: 380, objectFit: 'cover' }}
                      autoPlay muted playsInline
                    />
                    <FaceOverlay canvasRef={canvasRef} />
                  </div>
                  <p className="mt-2 mb-1 text-muted small" style={{ minHeight: 36 }}>{statusMsg}</p>
                  {debugLine && (
                    <div className="mb-2 px-2 py-1 rounded small" style={{ background: '#0d1117', color: '#3fb950', fontFamily: 'monospace', fontSize: 11 }}>
                      🔍 {debugLine}
                    </div>
                  )}
                  <div className="d-flex flex-wrap gap-2">
                    {!scanning
                      ? <Button variant="primary" onClick={startScanning} disabled={!canScan}>
                          {modelStatus === 'loading' ? <><Spinner size="sm" className="me-1" />Loading…</> : <><i className="bi bi-play-fill me-1" />Start Scanning</>}
                        </Button>
                      : <Button variant="danger" onClick={stopScanning}><i className="bi bi-stop-fill me-1" />Stop</Button>
                    }
                    <Button variant="outline-secondary" onClick={async () => { stopCamera(); await startCamera(); }}>
                      <i className="bi bi-arrow-clockwise me-1" />Restart Camera
                    </Button>
                  </div>
                </Tab>

                {/* Photo Match tab */}
                <Tab eventKey="photo" title={<><i className="bi bi-image me-1" />Match from Photo</>}>
                  <p className="text-muted small mb-2">
                    Upload a photo to test face recognition without a live camera. Useful for demos and testing.
                  </p>
                  <input
                    ref={photoFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={onPhotoChange}
                    className="form-control form-control-sm mb-2"
                    style={{ maxWidth: 400 }}
                  />
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt="To match"
                      style={{ width: '100%', maxWidth: 400, maxHeight: 300, objectFit: 'contain', borderRadius: 6, border: '1px solid #dee2e6', display: 'block', marginBottom: 8 }}
                    />
                  )}
                  {photoMatching && <ProgressBar animated now={100} label="Detecting…" className="mb-2" style={{ maxWidth: 400 }} />}
                  {photoMsg && (
                    <Alert variant={photoMsg.startsWith('✅') ? 'success' : photoMsg.startsWith('😐') ? 'warning' : 'danger'} className="py-2 small mb-2">
                      {photoMsg}
                    </Alert>
                  )}
                  <div className="d-flex gap-2">
                    <Button variant="primary" onClick={matchFromPhoto} disabled={photoMatching || !photoFile}>
                      {photoMatching ? <><Spinner size="sm" className="me-1" />Matching…</> : <><i className="bi bi-search me-1" />Match Face in Photo</>}
                    </Button>
                    <Button variant="outline-secondary" onClick={clearPhoto} disabled={photoMatching}>Clear</Button>
                  </div>
                </Tab>

              </Tabs>
            </Card.Body>
          </Card>

          {/* Manual Mess ID lookup */}
          <Card className="shadow-sm mt-3">
            <Card.Body>
              <h6 className="mb-2">Manual Mess ID Lookup</h6>
              <Form onSubmit={manualLookup}>
                <InputGroup>
                  <Form.Control placeholder="e.g. MESS-0001" value={manualId} onChange={(e) => setManualId(e.target.value)} />
                  <Button type="submit" variant="primary">Look Up</Button>
                </InputGroup>
              </Form>
            </Card.Body>
          </Card>

          {/* Re-enroll panel */}
          {reEnrollTarget && (
            <Card className="shadow-sm mt-3 border-warning">
              <Card.Body>
                <h6 className="mb-1">🔄 Re-enroll Face <span className="text-muted fw-normal">— {reEnrollTarget.name}</span></h6>
                <p className="text-muted small mb-2">
                  Recognition not working? Re-capture using 5 averaged frames for higher accuracy.
                </p>
                {captureProgress > 0 && captureProgress < 100 && (
                  <ProgressBar animated now={captureProgress} label={`${captureProgress}%`} className="mb-2" />
                )}
                {reEnrollMsg && (
                  <Alert variant={reEnrollMsg.startsWith('✅') ? 'success' : 'danger'} className="py-2 mb-2">{reEnrollMsg}</Alert>
                )}
                <Button variant="warning" size="sm" disabled={reEnrolling || !cameraOn} onClick={() => doReEnroll(reEnrollTarget)}>
                  {reEnrolling ? <><Spinner size="sm" className="me-1" />Capturing…</> : <><i className="bi bi-camera me-1" />Re-enroll Now (5 frames)</>}
                </Button>
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* ── Right column: subscriber card + check-in ── */}
        <Col lg={5}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <h6 className="text-muted mb-3">Subscriber Details</h6>
              {!matchCustomer ? (
                <div className="text-center text-muted py-4">
                  <div style={{ fontSize: 48 }}>👤</div>
                  <p className="mt-2">No subscriber identified yet.<br />Scan a face, upload a photo, or enter a Mess ID.</p>
                </div>
              ) : (
                <>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h5 className="mb-0">{matchCustomer.name}</h5>
                      <code className="text-muted">{matchCustomer.messId}</code>
                    </div>
                    <div className="text-end">
                      {matchCustomer.active ? <Badge bg="success">active</Badge> : <Badge bg="secondary">inactive</Badge>}
                      {isExpired(matchCustomer.validityDate) && <Badge bg="danger" className="ms-1">expired</Badge>}
                    </div>
                  </div>
                  <hr className="my-2" />
                  <Row className="small g-2 mb-2">
                    <Col xs={6}><span className="text-muted">Plan</span><br /><strong>{matchCustomer.planType}</strong></Col>
                    <Col xs={6}><span className="text-muted">Payment</span><br /><Badge bg={STATUS_VARIANT[matchCustomer.paymentStatus]}>{matchCustomer.paymentStatus}</Badge></Col>
                    <Col xs={6}><span className="text-muted">Valid until</span><br /><strong>{formatDate(matchCustomer.validityDate)}</strong></Col>
                    <Col xs={6}><span className="text-muted">Meals left</span><br /><strong style={{ fontSize: 20 }}>{matchCustomer.mealsRemaining}</strong></Col>
                    <Col xs={6}><span className="text-muted">Phone</span><br /><strong>{matchCustomer.phone}</strong></Col>
                  </Row>
                  <hr className="my-2" />
                  <Form.Label className="mb-1">
                    Meal Slot <span className="text-muted small">(auto: {getMealSlot() || 'outside hours'})</span>
                  </Form.Label>
                  <Form.Select value={mealSlot} onChange={(e) => setMealSlot(e.target.value)}>
                    {MEAL_SLOTS.map((s) => (
                      <option key={s} value={s} disabled={!slots.includes(s)}>
                        {s}{!slots.includes(s) ? ' — not in plan' : ''}
                      </option>
                    ))}
                  </Form.Select>
                  <Button className="mt-3 w-100" variant="success" size="lg" onClick={doCheckin}
                    disabled={!matchCustomer.active || isExpired(matchCustomer.validityDate) || matchCustomer.mealsRemaining <= 0}>
                    <i className="bi bi-check-circle me-2" />Check In ({mealSlot})
                  </Button>
                  {checkinMsg   && <Alert variant={checkinMsg.startsWith('ℹ') ? 'info' : 'success'} className="mt-2 mb-0 py-2">{checkinMsg}</Alert>}
                  {checkinError && <Alert variant="danger" className="mt-2 mb-0 py-2">{checkinError}</Alert>}
                  <Button variant="outline-secondary" size="sm" className="mt-2 w-100" onClick={clearMatch}>
                    <i className="bi bi-arrow-left-circle me-1" />Clear / next person
                  </Button>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
