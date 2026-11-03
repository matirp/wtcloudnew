import { useEffect, useRef, useState } from 'react';
import { Button, Alert, ProgressBar, Tab, Tabs } from 'react-bootstrap';
import { loadModels, captureAveragedDescriptor, detectFromImage } from './faceApi';

/**
 * Face enrollment widget with two modes:
 *   - Webcam: captures 5 averaged frames from the live camera
 *   - Photo:  uploads an image file and extracts the descriptor from it
 *
 * Calls onCapture(Array<number>) with the 128-value descriptor,
 * or onCapture(null) to clear.
 */
export default function FaceCapture({ onCapture, initialCaptured = false }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const fileRef   = useRef(null);

  const [tab,        setTab]        = useState('webcam'); // 'webcam' | 'photo'
  const [camStatus,  setCamStatus]  = useState('init');   // init | starting | ready | error
  const [captured,   setCaptured]   = useState(initialCaptured);
  const [capturing,  setCapturing]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [msg,        setMsg]        = useState('');
  const [preview,    setPreview]    = useState(null);     // data-URL for photo preview
  const [photoFile,  setPhotoFile]  = useState(null);

  // ── webcam lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'webcam') return;
    let cancelled = false;

    const start = async () => {
      setCamStatus('starting');
      try {
        await loadModels();
        if (cancelled) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        if (!cancelled) setCamStatus('ready');
      } catch (err) {
        if (!cancelled) { setCamStatus('error'); setMsg('Camera: ' + err.message); }
      }
    };

    const timer = setTimeout(start, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    };
  }, [tab]); // restart camera when switching back to webcam tab

  // ── webcam capture ────────────────────────────────────────────────────────
  const captureWebcam = async () => {
    setCapturing(true); setMsg('Hold still — capturing 5 frames…'); setProgress(0);
    const tick = setInterval(() => setProgress((p) => Math.min(p + 20, 90)), 350);
    try {
      const result = await captureAveragedDescriptor(videoRef.current, 5, 350);
      clearInterval(tick); setProgress(100);
      if (!result) {
        setMsg('No face detected — centre your face and try again.');
      } else {
        onCapture(Array.from(result.descriptor));
        setCaptured(true);
        setMsg(`✓ Captured from webcam (${result.framesUsed} frames averaged).`);
      }
    } catch (err) {
      clearInterval(tick); setMsg('Capture failed: ' + err.message);
    } finally {
      setCapturing(false); setTimeout(() => setProgress(0), 600);
    }
  };

  // ── photo upload ──────────────────────────────────────────────────────────
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setMsg('');
    setCaptured(false);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const capturePhoto = async () => {
    if (!photoFile) { setMsg('Please select an image first.'); return; }
    setCapturing(true); setMsg('Detecting face in photo…');
    try {
      await loadModels();
      const result = await detectFromImage(photoFile);
      if (!result) {
        setMsg('No face detected in this photo. Try a clearer, well-lit front-facing photo.');
      } else {
        onCapture(Array.from(result.descriptor));
        setCaptured(true);
        setMsg(`✓ Face extracted from photo (confidence ${result.detection.score.toFixed(2)}).`);
      }
    } catch (err) {
      setMsg('Photo extraction failed: ' + err.message);
    } finally {
      setCapturing(false);
    }
  };

  const clear = () => {
    onCapture(null); setCaptured(false); setMsg('');
    setPreview(null); setPhotoFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const msgClass = msg.startsWith('✓') ? 'text-success' : msg.startsWith('No') || msg.includes('failed') ? 'text-danger' : 'text-muted';

  return (
    <div style={{ maxWidth: 340 }}>
      <Tabs activeKey={tab} onSelect={(k) => { setTab(k); setMsg(''); }} className="mb-2" size="sm">

        {/* ── Webcam tab ── */}
        <Tab eventKey="webcam" title="📷 Webcam">
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <video
              ref={videoRef}
              width="320" height="240"
              autoPlay muted playsInline
              className="border rounded"
              style={{ display: 'block', background: '#111', opacity: camStatus === 'ready' ? 1 : 0, transition: 'opacity 0.3s' }}
            />
            {camStatus === 'starting' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 13, background: '#111', borderRadius: 4 }}>
                Starting camera…
              </div>
            )}
          </div>
          {camStatus === 'error' && <Alert variant="warning" className="mt-1 py-1 small">{msg}</Alert>}
          {camStatus === 'ready' && (
            <>
              {capturing && <ProgressBar animated now={progress} label={`${progress}%`} className="mt-1" />}
              <div className="mt-2 d-flex gap-2">
                <Button type="button" size="sm" variant="primary" onClick={captureWebcam} disabled={capturing}>
                  {capturing ? 'Capturing…' : '📸 Capture Face'}
                </Button>
                <Button type="button" size="sm" variant="outline-secondary" onClick={clear} disabled={capturing}>Clear</Button>
              </div>
            </>
          )}
        </Tab>

        {/* ── Photo upload tab ── */}
        <Tab eventKey="photo" title="🖼 Upload Photo">
          <div className="mb-2">
            <label className="text-muted small d-block mb-1">
              Upload a clear, front-facing photo (JPG / PNG):
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              className="form-control form-control-sm"
              style={{ maxWidth: 320 }}
            />
          </div>
          {preview && (
            <img
              src={preview}
              alt="Preview"
              style={{ width: 320, height: 240, objectFit: 'cover', borderRadius: 4, border: '1px solid #dee2e6', display: 'block', marginBottom: 8 }}
            />
          )}
          {capturing && <ProgressBar animated now={100} label="Detecting…" className="mb-2" />}
          <div className="d-flex gap-2">
            <Button type="button" size="sm" variant="primary" onClick={capturePhoto} disabled={capturing || !photoFile}>
              {capturing ? 'Detecting…' : '🔍 Extract Face from Photo'}
            </Button>
            <Button type="button" size="sm" variant="outline-secondary" onClick={clear} disabled={capturing}>Clear</Button>
          </div>
        </Tab>
      </Tabs>

      {msg && <div className={`small mt-1 ${msgClass}`}>{msg}</div>}
      {captured && <div className="text-success small mt-1">✓ Face descriptor ready to enroll.</div>}
    </div>
  );
}
