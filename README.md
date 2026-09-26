# AI FraudShield — AI Fraud Detection, Model Security & Failure Detection System

**Version:** 1.0.0  
**Standard:** IEEE 830 / ISO/IEC/IEEE 29148  
**Architecture:** FastAPI (Python 3.11) + SQLite (SQLAlchemy) + Scikit-Learn + React Dashboard  

---

## 1. Project Overview

AI FraudShield combines **multi-modal fraud and threat detection** (phishing messages, high-risk transactional patterns, malicious URLs, identity mismatches, and synthetic biometric features) with a continuous **Model Security, Health & Failure Detection system ("AI monitoring AI")**.

### Core Pillars
1. **Multi-Modal Threat Detection:**
   - **M1/M2 (`REAL_ML`):** Text Phishing Detection via TF-IDF + Logistic Regression & Naive Bayes with feature coefficient explainability.
   - **M3/M4 (`REAL_ML`):** Tabular Transaction Fraud Detection via Random Forest & `MLPClassifier` (ANN) with feature importances.
   - **M5/M6 (`REAL_ML`):** Anomaly Detection (Isolation Forest) & Out-of-Distribution / OOD detection (KNN 95th percentile distance threshold).
   - **Rule-Based Detectors (`RULE_BASED`):** Lexical URL Analyzer & Identity Consistency Verification.
   - **Multimedia Stubs (`MOCK`):** Voice, Face, and Document forensics stubs with explicit badges & disclaimers.
   - **Risk Engine:** Dynamic weight re-normalization (0–100 score) with uncertainty bonuses (+5 OOD, +3 model disagreement).

2. **Model Health, Reliability & Failure Monitoring:**
   - **Per-Case Reliability Score:** Combines mean confidence, model pair agreement, OOD status, and input quality.
   - **Rolling Window Health Telemetry:** Computes Accuracy, Precision, Recall, F1, FPR, FNR, and confusion matrix over human-reviewed cases.
   - **Distribution Drift Detection:** Continuous Population Stability Index (PSI) and Kolmogorov-Smirnov (KS) tests vs. baseline training distributions.
   - **Failure Detection Engine:** Evaluates warning and critical health rules. Status states: `HEALTHY`, `MODEL HEALTH ALERT`, `POTENTIAL MODEL FAILURE / LOW RELIABILITY`, `INSUFFICIENT_DATA`.
   - **Defensive Vulnerability Scanner:** Measures model decision stability and flip rate under controlled synthetic perturbations.

---

## 2. Directory Structure

```
ai-fraudshield/
├── README.md
├── requirements.txt
├── backend/
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── .env
│   ├── .env.example
│   ├── app/
│   │   ├── main.py              # FastAPI application factory & router mounting
│   │   ├── core/                # Configuration, JWT security, and rate limiting
│   │   ├── db/                  # SQLAlchemy models, SQLite database, and seed logic
│   │   ├── schemas/             # Pydantic v2 validation contracts
│   │   ├── ml/
│   │   │   ├── data_gen.py      # Synthetic text, tabular, and drifted batch generation
│   │   │   ├── preprocess.py    # Sanitization, vectorization, and feature preparation
│   │   │   ├── train_all.py     # End-to-end model training and artifact export
│   │   │   ├── detectors/       # M1-M6 detectors and rule engines
│   │   │   └── artifacts/       # Serialized .joblib model files
│   │   ├── services/            # Pipeline orchestrator, risk engine, health monitor, etc.
│   │   ├── routers/             # 24 REST API endpoints across 10 resource routers
│   │   └── config/              # risk_config.yaml & health_rules.yaml
│   └── tests/                   # End-to-end integration test suite
└── data/                        # Tabular reference dataset and canary test suites
```

---

## 3. Quick Start & Execution

### Prerequisites
- Python 3.10+ (Python 3.11 environment configured at `backend/.venv`)
- Virtual environment with all dependencies installed.

### Step 1: Activate Virtual Environment
In PowerShell:
```powershell
cd "backend"
.\.venv\Scripts\Activate.ps1
```

### Step 2: Start the FastAPI Backend Server
Run Uvicorn from the `backend/` directory:
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Base URL: `http://127.0.0.1:8000/api/v1`
- Interactive OpenAPI / Swagger UI: `http://127.0.0.1:8000/docs`
- Health / Liveness Probe: `http://127.0.0.1:8000/health`

---

## 4. Default Seed Credentials (RBAC)

The database (`fraudshield.db`) is pre-seeded with 3 roles:

| Username | Password | Role | Permissions |
|:---|:---|:---|:---|
| `admin` | `Admin@FraudShield2026` | `admin` | Full system access: users, config, evaluation, scanner, health, all cases |
| `analyst` | `Analyst@FraudShield2026` | `analyst` | Analyze cases, view results, human review queue, acknowledge alerts |
| `auditor` | `Auditor@FraudShield2026` | `auditor` | Read-only access: cases, alerts, audit logs, model health |

---

## 5. Running Tests & Quality Verification

Run the full integration test suite with `pytest`:
```powershell
cd "backend"
.\.venv\Scripts\python.exe -m pytest -v tests/test_api.py
```
*(All 8 test suites pass covering auth, benign cases, phishing/fraud cases, drift, health, defensive scanner, and dashboard telemetry).*

---

## 6. Retraining & Reseeding

- **Retrain all ML models (M1–M6) and export artifacts:**
  ```powershell
  python -m app.ml.train_all
  ```
- **Reset and reseed database:**
  ```powershell
  python -m app.db.seed
  ```
