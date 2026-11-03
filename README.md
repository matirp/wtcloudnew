# Mess Management System with Face Recognition

A full-stack college web-technology project — no login required, open direct access to every feature.

- **Frontend:** React (Vite) + Bootstrap 5 + react-bootstrap, with [face-api.js](https://github.com/justadudewhohacks/face-api.js) for in-browser face recognition.
- **Backend:** Node.js + Express + Mongoose (REST API, no auth middleware).
- **Database:** MongoDB.

## Features

| Feature | Detail |
|---|---|
| **Face Scanner** | Live webcam (`getUserMedia`) + face-api.js: matches a face against enrolled descriptors and shows the subscriber's mess card instantly. Falls back to manual Mess ID. |
| **Meal Check-in** | Auto-detects the current meal slot (with override). Decrements one meal credit. Blocks duplicate check-ins for the same slot+day. |
| **Customer CRUD** | Add / list / update / deactivate subscribers with client- and server-side validation. |
| **Face Enrollment** | Capture a 128-d face descriptor from the webcam during add/edit and store it. |
| **Attendance Log** | Filterable table of all check-ins by date, slot, or Mess ID. |
| **Dashboard** | Active subscriber count, total meals remaining, today's check-ins per slot, pending payments. |

### Fixed plan tiers (30-day validity)

| Plan | Meals | Slots |
|---|---|---|
| Full Board | 90 | Breakfast + Lunch + Dinner |
| Lunch Only | 30 | Lunch |
| Breakfast + Dinner | 60 | Breakfast + Dinner |

## Folder structure

```
wtcloudnew/
  server/                    Node + Express + Mongoose REST API
    server.js                Entry point (open routes, no auth)
    config/db.js
    models/                  Customer.js, Attendance.js
    middleware/              error.js
    routes/                  customerRoutes.js, attendanceRoutes.js
    utils/                   plans.js, seed.js
    tests/                   jest + supertest + mongodb-memory-server
  client/                    React + Vite + Bootstrap 5
    vite.config.js           dev proxy /api → http://localhost:5000
    public/models/           face-api.js weight files (see below)
    src/
      App.jsx                router — opens at /scanner
      components/
        Navbar.jsx           Scanner | Customers | Attendance | Dashboard
        Scanner/             Scanner.jsx, faceApi.js, FaceOverlay.jsx, FaceCapture.jsx
        Customers/           CustomerList.jsx, CustomerForm.jsx
        Attendance/          AttendanceLog.jsx, Dashboard.jsx
      api/                   axios.js, customers.js, attendance.js
      utils/                 validation.js, slot.js
      __tests__/             vitest
```

## Prerequisites

- **Node.js 18+**
- **MongoDB** — local `mongodb://127.0.0.1:27017/mess` or a free Atlas cluster
- A **webcam** for face scan/enrollment (manual Mess ID lookup works without one)

## Quick start

### 1 — Server

```bash
cd server
npm install
cp .env.example .env        # set MONGO_URI; JWT_SECRET not needed
npm run dev                 # → http://localhost:5000
```

**`.env` minimum:**
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/mess
```

### 2 — Client

```bash
cd client
npm install
# ⚠ Place face-api.js model weights in client/public/models/  (see below)
npm run dev                 # → http://localhost:5173
```

Open **http://localhost:5173** — it lands directly on the scanner.

### 3 — Face recognition model weights

Download from the face-api.js GitHub repo and copy into `client/public/models/`:

```
https://github.com/justadudewhohacks/face-api.js/tree/master/weights
```

Required files:
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

Without the weights: face-scan is disabled but **manual Mess ID lookup still works**.

## npm packages

| | Packages |
|---|---|
| **server** | express, mongoose, cors, dotenv, morgan |
| **server dev** | nodemon, jest, supertest, mongodb-memory-server |
| **client** | react, react-dom, react-router-dom, axios, bootstrap, react-bootstrap, face-api.js |
| **client dev** | vite, @vitejs/plugin-react, vitest, @testing-library/react, jsdom |

## Running tests

```bash
cd server && npm test        # jest + supertest (in-memory MongoDB) — 24 tests
cd client && npm test        # vitest — 9 tests
```

## API reference

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Server health |
| GET | `/api/customers` | List (filters: search, active, planType, paymentStatus) |
| GET | `/api/customers/faces` | Enrolled face descriptors for the scanner |
| GET | `/api/customers/by-mess/:id` | Look up by Mess ID |
| GET | `/api/customers/:id` | Get one |
| POST | `/api/customers` | Create |
| PUT | `/api/customers/:id` | Update (plan change recomputes meals & validity) |
| PUT | `/api/customers/:id/face` | Store face descriptor |
| DELETE | `/api/customers/:id` | Deactivate (`?hard=true` to hard-delete) |
| POST | `/api/attendance/checkin` | Check in `{ messId, mealSlot }` |
| GET | `/api/attendance` | All logs (filters: date, mealSlot, messId) |

## End-to-end demo

1. Start the server and client.
2. Go to **Customers → Add Customer**. Fill in name / phone / plan. Tick **Enroll Face** → face the webcam → click **Capture Face** → **Create Customer**. The customer gets a Mess ID like `MESS-0001`.
3. Go to **Scanner**. Click **Start Scanning** — the webcam opens and starts detecting. Face the camera: the customer card appears on the right showing Plan, Validity, Meals Remaining, Payment Status.
4. Confirm the **Meal Slot** (auto-detected) and click **Check In** — meals decrement by 1.
5. Try **Check In** again for the same slot → "Already checked in for Breakfast today".
6. For a customer without an enrolled face: type their Mess ID in the **Manual ID Lookup** box and click **Look Up** — same card and check-in flow.
7. Go to **Attendance** to see the logged entry. Go to **Dashboard** to see today's totals.
