# face-api.js model weights

This folder must contain the **weight files** for the three models used by the
scanner. Download them from the face-api.js repository and place them here.

## Required models

- `tiny_face_detector` — fast face detection (used for the live webcam scan)
- `face_landmark_68` — 68-point face landmarks (alignment before recognition)
- `face_recognition` — computes the 128-value face descriptor

## How to get them

Option A — download from the face-api.js repo:

  https://github.com/justadudewhohacks/face-api.js/tree/master/weights

Copy these files/folders into `client/public/models/`:

```
public/models/
  tiny_face_detector_model-weights_manifest.json
  tiny_face_detector_model-shard1
  face_landmark_68_model-weights_manifest.json
  face_landmark_68_model-shard1
  face_recognition_model-weights_manifest.json
  face_recognition_model-shard1
  face_recognition_model-shard2
```

Option B — fetch from the CDN-friendly tree and move them here. The exact shard
files are the ones above; keep the `*-weights_manifest.json` and its shard(s)
together in this directory.

## Notes

- The code loads models from `/models`, which Vite serves from `public/`.
- Scanning still works without these weights via **manual Mess ID lookup**.
- `ssd_mobilenetv1` is not required; the app uses the lighter Tiny Face Detector.
