import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/services/mockDb';
import { runFullPipeline } from './src/services/mlEngine';
import { computeRollingHealthSnapshot, simulateFeatureDrift } from './src/services/healthEngine';
import { runDefensiveRobustnessScan } from './src/services/robustnessScanner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

// Liveness probe (FR-OPS-1)
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'AI FraudShield',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

const apiV1 = express.Router();

// --- Auth Router ---
apiV1.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const validUsers: Record<string, { pass: string; role: 'admin' | 'analyst' | 'auditor' }> = {
    admin: { pass: 'Admin@FraudShield2026', role: 'admin' },
    analyst: { pass: 'Analyst@FraudShield2026', role: 'analyst' },
    auditor: { pass: 'Auditor@FraudShield2026', role: 'auditor' },
  };

  const userConfig = validUsers[username];
  if (!userConfig || userConfig.pass !== password) {
    db.addAuditLog({
      action: 'LOGIN',
      resource: 'auth',
      outcome: 'FAILURE',
      username: username || 'unknown',
      ip_address: req.ip || '127.0.0.1',
      details: `Failed authentication attempt for username '${username}'`,
    });
    return res.status(401).json({ error: 'Incorrect username or password' });
  }

  const user = db.users.find(u => u.username === username);

  db.addAuditLog({
    action: 'LOGIN',
    resource: 'auth',
    outcome: 'SUCCESS',
    user_id: user?.id,
    username,
    ip_address: req.ip || '127.0.0.1',
    details: `User '${username}' logged in successfully with role '${userConfig.role}'`,
  });

  return res.json({
    access_token: `token_${username}_${Date.now()}`,
    token_type: 'bearer',
    user: {
      id: user?.id || 1,
      username,
      role: userConfig.role,
    },
  });
});

apiV1.get('/auth/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.includes('analyst')) {
    return res.json(db.users.find(u => u.username === 'analyst'));
  }
  if (authHeader.includes('auditor')) {
    return res.json(db.users.find(u => u.username === 'auditor'));
  }
  return res.json(db.users.find(u => u.username === 'admin'));
});

apiV1.post('/auth/users', (req, res) => {
  const { username, role = 'analyst' } = req.body || {};
  if (!username) {
    return res.status(422).json({ error: 'Username is required' });
  }
  const existing = db.users.find(u => u.username === username);
  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const newUser = db.addUser({
    username,
    role: role as 'admin' | 'analyst' | 'auditor',
    isActive: true,
  });
  db.addAuditLog({
    action: 'USER_CREATE',
    resource: 'users',
    resource_id: String(newUser.id),
    outcome: 'SUCCESS',
    username: 'admin',
    ip_address: req.ip || '127.0.0.1',
    details: `Created new user '${username}' with role '${role}'`,
  });
  res.status(201).json(newUser);
});

// --- Dashboard Router ---
apiV1.get('/dashboard/stats', (_req, res) => {
  const totalCases = db.cases.length;
  const levelCounts = {
    Low: db.cases.filter(c => c.risk_level === 'Low').length,
    Medium: db.cases.filter(c => c.risk_level === 'Medium').length,
    High: db.cases.filter(c => c.risk_level === 'High').length,
    Critical: db.cases.filter(c => c.risk_level === 'Critical').length,
  };

  const openAlertsCount = db.alerts.filter(a => a.status === 'open').length;
  const pendingReviewsCount = db.cases.filter(c => c.needs_human_review && !c.review).length;

  const fpCount = db.reviews.filter(r => r.decision === 'false_positive').length;
  const fnCount = db.reviews.filter(r => r.decision === 'false_negative').length;
  const confirmedFraud = db.reviews.filter(r => r.decision === 'confirmed_fraud').length;

  const latestCase = db.cases[0];
  const latestRisk = latestCase?.risk_score ?? 0;
  const latestLevel = latestCase?.risk_level ?? 'Low';

  const timeline = db.cases.slice(0, 30).map(c => ({
    case_id: c.id,
    timestamp: c.created_at,
    score: c.risk_score,
    level: c.risk_level,
  })).reverse();

  const latestHealth = db.healthSnapshots[0];

  res.json({
    total_cases: totalCases,
    level_counts: levelCounts,
    open_alerts_count: openAlertsCount,
    pending_reviews_count: pendingReviewsCount,
    fp_count: fpCount,
    fn_count: fnCount,
    confirmed_fraud: confirmedFraud,
    latest_risk_score: latestRisk,
    latest_risk_level: latestLevel,
    health_status: latestHealth?.status || 'HEALTHY',
    timeline,
  });
});

// --- Cases Router ---
apiV1.get('/cases', (req, res) => {
  let list = [...db.cases];
  const { risk_level, status, needs_human_review, limit = 50, offset = 0 } = req.query;

  if (risk_level) {
    list = list.filter(c => c.risk_level === risk_level);
  }
  if (status) {
    list = list.filter(c => c.status === status);
  }
  if (needs_human_review !== undefined) {
    const isNeeds = needs_human_review === 'true';
    list = list.filter(c => c.needs_human_review === isNeeds);
  }

  const paginated = list.slice(Number(offset), Number(offset) + Number(limit));
  res.json(paginated);
});

apiV1.get('/cases/:id', (req, res) => {
  const caseId = Number(req.params.id);
  const found = db.cases.find(c => c.id === caseId);
  if (!found) {
    return res.status(404).json({ error: 'Case not found' });
  }
  res.json(found);
});

apiV1.get('/cases/:id/detections', (req, res) => {
  const caseId = Number(req.params.id);
  const found = db.cases.find(c => c.id === caseId);
  if (!found) {
    return res.status(404).json({ error: 'Case not found' });
  }
  res.json(found.detections);
});

apiV1.get('/cases/:id/risk', (req, res) => {
  const caseId = Number(req.params.id);
  const found = db.cases.find(c => c.id === caseId);
  if (!found) {
    return res.status(404).json({ error: 'Case not found' });
  }
  res.json(found.risk_detail);
});

apiV1.get('/cases/:id/report', (req, res) => {
  const caseId = Number(req.params.id);
  const found = db.cases.find(c => c.id === caseId);
  if (!found) {
    return res.status(404).json({ error: 'Case not found' });
  }
  res.json({
    report_id: `REP-${found.id}-${Date.now()}`,
    case_id: found.id,
    generated_at: new Date().toISOString(),
    status: found.status,
    risk_score: found.risk_score,
    risk_level: found.risk_level,
    reliability_score: found.reliability_score,
    reliability_level: found.reliability_level,
    needs_human_review: found.needs_human_review,
    detections: found.detections,
    risk_breakdown: found.risk_detail.breakdown,
    explanation: found.risk_detail.explanation,
    review: found.review || null,
    disclaimer: 'Academic prototype. Synthetic data. Thresholds require validation on representative data.',
  });
});

apiV1.post('/cases/analyze', (req, res) => {
  const payload = req.body || {};
  const hasText = Boolean(payload.text && payload.text.trim());
  const hasUrl = Boolean(payload.url && payload.url.trim());
  const hasTxn = payload.transaction !== undefined;
  const hasId = payload.identity !== undefined;
  const hasMedia = payload.media_features !== undefined;

  if (!hasText && !hasUrl && !hasTxn && !hasId && !hasMedia) {
    return res.status(422).json({
      error: 'Case must contain at least one analysable content element (text, url, transaction, identity, or media_features).',
    });
  }

  const pipelineRes = runFullPipeline(payload, db.riskConfig);
  const hash = 'chash_' + Math.random().toString(36).substring(2, 10);

  const status = pipelineRes.reliabilityDetail.needs_human_review ? 'in_review' : 'analysed';

  const newCase = db.addCase({
    created_at: new Date().toISOString(),
    created_by: 1,
    status,
    risk_score: pipelineRes.riskDetail.score,
    risk_level: pipelineRes.riskDetail.level,
    needs_human_review: pipelineRes.reliabilityDetail.needs_human_review,
    reliability_score: pipelineRes.reliabilityDetail.score,
    reliability_level: pipelineRes.reliabilityDetail.level,
    content_hash: hash,
    payload,
    detections: pipelineRes.detections,
    risk_detail: pipelineRes.riskDetail,
    reliability_detail: pipelineRes.reliabilityDetail,
  });

  // Automatically raise alert if High/Critical or OOD
  if (newCase.risk_level === 'Critical' || newCase.risk_level === 'High') {
    db.addAlert({
      alert_type: `${newCase.risk_level.toUpperCase()}_RISK_DETECTED`,
      severity: newCase.risk_level === 'Critical' ? 'critical' : 'warning',
      status: 'open',
      message: `Case #${newCase.id} evaluated as ${newCase.risk_level} Risk (Score: ${newCase.risk_score}). Reliability: ${newCase.reliability_level}`,
      details: { case_id: newCase.id, risk_score: newCase.risk_score },
      case_id: newCase.id,
    });
  }

  db.addAuditLog({
    action: 'CASE_ANALYZE',
    resource: 'cases',
    resource_id: String(newCase.id),
    outcome: 'SUCCESS',
    user_id: 1,
    username: 'analyst',
    ip_address: req.ip || '127.0.0.1',
    details: `Analyzed Case #${newCase.id}: Risk ${newCase.risk_score} (${newCase.risk_level}), Reliability ${newCase.reliability_score}`,
  });

  res.json(newCase);
});

// --- Model Health Router ---
apiV1.get('/model-health', (_req, res) => {
  let snapshot = db.healthSnapshots[0];
  if (!snapshot) {
    snapshot = computeRollingHealthSnapshot(50);
  }
  res.json(snapshot);
});

apiV1.get('/model-health/history', (req, res) => {
  const limit = Number(req.query.limit) || 20;
  res.json(db.healthSnapshots.slice(0, limit));
});

apiV1.post('/model-health/evaluate', (req, res) => {
  const windowSize = Number(req.body?.window_size) || 50;
  const snapshot = computeRollingHealthSnapshot(windowSize);

  db.addAuditLog({
    action: 'MODEL_EVALUATION',
    resource: 'model-health',
    outcome: 'SUCCESS',
    username: 'admin',
    ip_address: req.ip || '127.0.0.1',
    details: `Evaluated health window of ${windowSize} samples. Resulting status: ${snapshot.status}`,
  });

  res.json(snapshot);
});

apiV1.post('/model-health/drift-simulation', (req, res) => {
  const severity = req.body?.severity || 'moderate';
  const snapshot = simulateFeatureDrift(severity);

  db.addAuditLog({
    action: 'DRIFT_SIMULATION',
    resource: 'model-health',
    outcome: 'SUCCESS',
    username: 'admin',
    ip_address: req.ip || '127.0.0.1',
    details: `Injected synthetic feature drift (severity: ${severity}). Max PSI: ${snapshot.drift.psi_max}`,
  });

  res.json(snapshot);
});

apiV1.post('/model-health/simulate-drift', (req, res) => {
  const severity = req.body?.severity || 'moderate';
  const snapshot = simulateFeatureDrift(severity);

  db.addAuditLog({
    action: 'DRIFT_SIMULATION',
    resource: 'model-health',
    outcome: 'SUCCESS',
    username: 'admin',
    ip_address: req.ip || '127.0.0.1',
    details: `Injected synthetic feature drift (severity: ${severity}). Max PSI: ${snapshot.drift.psi_max}`,
  });

  res.json(snapshot);
});

// --- Alerts Router ---
apiV1.get('/alerts', (req, res) => {
  let list = [...db.alerts];
  const { status, severity, limit = 50 } = req.query;

  if (status) list = list.filter(a => a.status === status);
  if (severity) list = list.filter(a => a.severity === severity);

  res.json(list.slice(0, Number(limit)));
});

apiV1.patch('/alerts/:id', (req, res) => {
  const alertId = Number(req.params.id);
  const alert = db.alerts.find(a => a.id === alertId);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  const { status: newStatus } = req.body;
  const oldStatus = alert.status;
  alert.status = newStatus;
  if (newStatus === 'resolved') {
    alert.resolved_by = 1;
    alert.resolved_at = new Date().toISOString();
  }

  db.addAuditLog({
    action: 'ALERT_CHANGE',
    resource: 'alerts',
    resource_id: String(alert.id),
    outcome: 'SUCCESS',
    username: 'analyst',
    ip_address: req.ip || '127.0.0.1',
    details: `Alert #${alert.id} status changed from '${oldStatus}' to '${newStatus}'`,
  });

  res.json(alert);
});

// --- Human Reviews Router ---
apiV1.get('/reviews/queue', (_req, res) => {
  const pending = db.cases
    .filter(c => c.needs_human_review && !c.review)
    .map(c => ({
      case_id: c.id,
      created_at: c.created_at,
      risk_score: c.risk_score,
      risk_level: c.risk_level,
      reliability_score: c.reliability_score,
      trigger_reason: c.risk_score >= 61 ? 'High / Critical Risk' : 'Low Reliability / OOD Input',
      payload: c.payload,
    }));
  res.json(pending);
});

apiV1.post('/reviews/:caseId', (req, res) => {
  const caseId = Number(req.params.caseId);
  const targetCase = db.cases.find(c => c.id === caseId);
  if (!targetCase) {
    return res.status(404).json({ error: 'Case not found' });
  }

  if (targetCase.review) {
    return res.status(409).json({ error: 'Case has already been reviewed' });
  }

  const { decision, notes } = req.body;
  if (!decision) {
    return res.status(422).json({ error: 'Review decision is required' });
  }

  const groundTruthLabel: 0 | 1 = (decision === 'confirmed_fraud' || decision === 'false_negative') ? 1 : 0;

  const newReview = db.addReview({
    case_id: caseId,
    reviewed_by: 2,
    reviewed_by_username: 'analyst',
    decision,
    ground_truth_label: groundTruthLabel,
    notes: notes || `Investigated by analyst. Decision: ${decision}`,
  });

  targetCase.review = newReview;
  targetCase.status = 'closed';

  // Recalculate health telemetry with ground truth
  computeRollingHealthSnapshot(50);

  db.addAuditLog({
    action: 'HUMAN_REVIEW',
    resource: 'reviews',
    resource_id: String(caseId),
    outcome: 'SUCCESS',
    username: 'analyst',
    ip_address: req.ip || '127.0.0.1',
    details: `Case #${caseId} reviewed. Ground truth: ${decision}. Health metrics re-computed.`,
  });

  res.json(newReview);
});

// --- Defensive Robustness Scanner Router ---
apiV1.post('/scanner/run', (req, res) => {
  const { n_samples = 50, noise_level = 0.10, target = 'all' } = req.body || {};
  const scanResult = runDefensiveRobustnessScan(n_samples, noise_level, target);

  db.addAuditLog({
    action: 'SCANNER_RUN',
    resource: 'scanner',
    outcome: 'SUCCESS',
    username: 'admin',
    ip_address: req.ip || '127.0.0.1',
    details: `Admin ran robustness scan on ${n_samples} samples. Flip rate: ${(scanResult.flip_rate * 100).toFixed(1)}%`,
  });

  res.json(scanResult);
});

// --- Config Router ---
apiV1.get('/config/risk', (_req, res) => {
  res.json(db.riskConfig);
});

apiV1.put('/config/risk', (req, res) => {
  const { weights, uncertainty_bonuses, levels, reliability_weights } = req.body || {};
  if (weights) Object.assign(db.riskConfig.weights, weights);
  if (uncertainty_bonuses) Object.assign(db.riskConfig.uncertainty_bonuses, uncertainty_bonuses);
  if (levels) Object.assign(db.riskConfig.levels, levels);
  if (reliability_weights) Object.assign(db.riskConfig.reliability_weights, reliability_weights);

  db.addAuditLog({
    action: 'CONFIG_CHANGE',
    resource: 'risk_config',
    outcome: 'SUCCESS',
    username: 'admin',
    ip_address: req.ip || '127.0.0.1',
    details: 'Admin updated risk engine weights and parameters.',
  });

  res.json({ message: 'Risk configuration updated successfully', config: db.riskConfig });
});

// --- Models Router ---
apiV1.get('/models', (_req, res) => {
  res.json(db.models);
});

// --- Audit Logs Router ---
apiV1.get('/audit-logs', (req, res) => {
  let list = [...db.auditLogs];
  const { action, limit = 50, offset = 0 } = req.query;
  if (action) list = list.filter(l => l.action === action);
  res.json(list.slice(Number(offset), Number(offset) + Number(limit)));
});

// Mount API v1
app.use('/api/v1', apiV1);

// Mount Vite or static files
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI FraudShield Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
