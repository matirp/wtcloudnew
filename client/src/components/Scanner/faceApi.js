import * as faceapi from 'face-api.js';

let modelsLoaded = false;

const MODEL_URL = import.meta.env.VITE_MODEL_URL || '/models';

export async function loadModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export function areModelsLoaded() {
  return modelsLoaded;
}

// Detect the best face in a video frame and return descriptor + detection.
// Result shape: { descriptor: Float32Array(128), detection: FaceDetection }
export async function detectFaceFull(video) {
  if (!video || video.readyState < 2) return null;
  try {
    const result = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return result || null;
  } catch (err) {
    console.warn('detectFaceFull error:', err);
    return null;
  }
}

// Capture N frames and return the averaged descriptor for higher accuracy.
export async function captureAveragedDescriptor(video, frames = 5, delayMs = 300) {
  const descriptors = [];
  for (let i = 0; i < frames; i++) {
    const result = await detectFaceFull(video);
    if (result) descriptors.push(result.descriptor);
    if (i < frames - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  if (descriptors.length === 0) return null;
  const avg = new Float32Array(128);
  for (const d of descriptors) for (let i = 0; i < 128; i++) avg[i] += d[i];
  for (let i = 0; i < 128; i++) avg[i] /= descriptors.length;
  return { descriptor: avg, framesUsed: descriptors.length };
}

// Extract a face descriptor from an <img> element or image URL.
// Returns { descriptor: Float32Array(128) } or null if no face found.
export async function detectFromImage(source) {
  // source can be an HTMLImageElement, a File, or a data-URL string
  let img;
  if (source instanceof HTMLImageElement) {
    img = source;
  } else if (source instanceof File) {
    img = await fileToImage(source);
  } else if (typeof source === 'string') {
    img = await urlToImage(source);
  } else {
    throw new Error('detectFromImage: unsupported source type');
  }

  const result = await faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result || null;
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

function urlToImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}


// Returns the closest match details.
export function matchDescriptor(customers, liveDescriptor) {
  if (!customers || customers.length === 0 || !liveDescriptor) {
    return { matched: false, messId: null, name: null, distance: 1, closest: null };
  }

  const live = Array.from(liveDescriptor); // Float32Array → plain array
  let best = null;
  let bestDist = Infinity;

  for (const c of customers) {
    if (!Array.isArray(c.faceDescriptor) || c.faceDescriptor.length !== 128) continue;
    let sum = 0;
    for (let i = 0; i < 128; i++) {
      const d = live[i] - c.faceDescriptor[i];
      sum += d * d;
    }
    const dist = Math.sqrt(sum);
    if (dist < bestDist) { bestDist = dist; best = c; }
  }

  if (!best) return { matched: false, messId: null, name: null, distance: 1, closest: null };

  const THRESHOLD = 0.6;
  const matched = bestDist <= THRESHOLD;
  return {
    matched,
    messId:  matched ? best.messId : null,
    name:    matched ? best.name   : null,
    distance: bestDist,
    closest:  best.name,
  };
}

// Draw a bounding box + optional label on an overlay canvas.
// `result` is the full object returned by detectFaceFull (has .detection property).
export function drawDetection(canvas, result, label, color) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!result) return;

  try {
    // result.detection.box holds the raw coordinates relative to the input size
    const box = result.detection.box;
    const iw  = result.detection.imageWidth;   // original detection input width
    const ih  = result.detection.imageHeight;  // original detection input height
    const cw  = canvas.width;
    const ch  = canvas.height;

    // Scale box from input dimensions to canvas display dimensions
    const scaleX = cw / iw;
    const scaleY = ch / ih;
    const x = box.x      * scaleX;
    const y = box.y      * scaleY;
    const w = box.width  * scaleX;
    const h = box.height * scaleY;

    const strokeColor = color || (label ? '#28a745' : '#ffc107');
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth   = 3;
    ctx.strokeRect(x, y, w, h);

    if (label) {
      ctx.fillStyle = strokeColor;
      ctx.font      = 'bold 16px Arial';
      ctx.fillText(label, x, y > 24 ? y - 8 : y + h + 20);
    }
  } catch (e) {
    // silently ignore drawing errors — matching still proceeds
    console.warn('drawDetection error:', e.message);
  }
}

export { faceapi };
