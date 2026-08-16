# Digital Twin Substation

An AI/ML-based Digital Twin system for EHV (Extra High Voltage) Substations. This project provides real-time monitoring, 3D visualization, anomaly/fault prediction, and analytical simulation of substation components (transformers, busbars, isolators, baylines, circuit breakers).

The architecture is divided into three main decoupled services:
1. **Frontend**: A Next.js App Router project utilizing Three.js for 3D visualization, React Leaflet for mapping, Recharts for trends, and Tailwind CSS v4.
2. **Backend**: An Express.js Node API (TypeScript) that bridges database connections, Firebase, video streaming, and coordinates ML endpoints.
3. **ML Service**: A Python FastAPI service that executes predictive and simulation workflows utilizing XGBoost, LSTM, and Isolation Forest models.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10-3.12 recommended)
- MongoDB running locally or inside Docker
- Firebase Account (for Realtime DB / Firestore logs)

### Option 1: Docker Compose (Unified Run)
You can build and start all three services along with MongoDB using the root Docker Compose file:
```bash
docker-compose up --build
```

### Option 2: Running Services Individually

#### 1. ML Service (FastAPI)
```bash
cd ml
pip install -r requirements.txt
python src/main.py
```
Runs at `http://localhost:8000`.

#### 2. Backend (Express API)
```bash
cd backend
npm install
npm run dev
```
Runs at `http://localhost:5000`.

#### 3. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:3000`.

---

## Environment Variables

Copy the `.env.example` file in the respective folders or check the root `.env.example` for reference.

- **Frontend**: Safe-to-expose keys like `NEXT_PUBLIC_BACKEND_URL`, Firebase public config.
- **Backend**: Private credentials like `MONGODB_URI`, `FIREBASE_SERVICE_ACCOUNT_PATH`, SMTP configurations.
- **ML**: Model directory settings and timeout configurations.
