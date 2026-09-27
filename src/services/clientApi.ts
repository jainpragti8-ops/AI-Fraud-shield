import { db } from './mockDb';
import { runFullPipeline } from './mlEngine';
import { computeRollingHealthSnapshot, simulateFeatureDrift } from './healthEngine';
import { runDefensiveRobustnessScan } from './robustnessScanner';

export function handleClientApiRequest(
  pathname: string,
  method: string = 'GET',
  body?: any,
  searchParams?: URLSearchParams
): any {
  const normPath = pathname.replace(/\/+$/, '') || '/';
  const normMethod = method.toUpperCase();
  const params = searchParams || new URLSearchParams();

  // Liveness probe (FR-OPS-1)
  if (normPath === '/health') {
    return {
      status: 'healthy',
      service: 'AI FraudShield',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  // --- Auth Endpoints ---
  if (normPath === '/api/v1/auth/login' && normMethod === 'POST') {
    const { username, password } = body || {};
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
        ip_address: '127.0.0.1',
        details: `Failed authentication attempt for username '${username}'`,
      });
      return { error: 'Incorrect username or password' };
    }

    const user = db.users.find(u => u.username === username);
    db.addAuditLog({
      action: 'LOGIN',
      resource: 'auth',
      outcome: 'SUCCESS',
      user_id: user?.id,
      username,
      ip_address: '127.0.0.1',
      details: `User '${username}' logged in successfully with role '${userConfig.role}'`,
    });

    return {
      access_token: `token_${username}_${Date.now()}`,
      token_type: 'bearer',
      user: {
        id: user?.id || 1,
        username,
        role: userConfig.role,
      },
    };
  }

  if (normPath === '/api/v1/auth/me') {
    return db.users.find(u => u.username === 'admin') || db.users[0];
  }

  // --- Dashboard Stats ---
  if (normPath === '/api/v1/dashboard/stats') {
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

    const latestHealth = db.healthSnapshots[0] || computeRollingHealthSnapshot(50);

    return {
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
    };
  }

  // --- Cases Endpoints ---
  if (normPath === '/api/v1/cases' && normMethod === 'GET') {
    let list = [...db.cases];
    const risk_level = params.get('risk_level');
    const status = params.get('status');
    const needs_human_review = params.get('needs_human_review');
    const limit = Number(params.get('limit')) || 50;
    const offset = Number(params.get('offset')) || 0;

    if (risk_level) list = list.filter(c => c.risk_level === risk_level);
    if (status) list = list.filter(c => c.status === status);
    if (needs_human_review !== null && needs_human_review !== undefined && needs_human_review !== '') {
      const isNeeds = needs_human_review === 'true';
      list = list.filter(c => c.needs_human_review === isNeeds);
    }

    return list.slice(offset, offset + limit);
  }

  // Analyze Case
  if (normPath === '/api/v1/cases/analyze' && normMethod === 'POST') {
    const payload = body || {};
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
      ip_address: '127.0.0.1',
      details: `Analyzed Case #${newCase.id}: Risk ${newCase.risk_score} (${newCase.risk_level}), Reliability ${newCase.reliability_score}`,
    });

    return newCase;
  }

  // Single Case Sub-routes: /api/v1/cases/:id/*
  const caseMatch = normPath.match(/^\/api\/v1\/cases\/(\d+)(?:\/(detections|risk|report))?$/);
  if (caseMatch) {
    const caseId = Number(caseMatch[1]);
    const subRoute = caseMatch[2];
    const found = db.cases.find(c => c.id === caseId);
    if (!found) return { error: 'Case not found' };

    if (!subRoute) return found;
    if (subRoute === 'detections') return found.detections;
    if (subRoute === 'risk') return found.risk_detail;
    if (subRoute === 'report') {
      return {
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
      };
    }
  }

  // --- Model Health Endpoints ---
  if (normPath === '/api/v1/model-health' && normMethod === 'GET') {
    let snapshot = db.healthSnapshots[0];
    if (!snapshot) {
      snapshot = computeRollingHealthSnapshot(50);
    }
    return snapshot;
  }

  if (normPath === '/api/v1/model-health/history') {
    const limit = Number(params.get('limit')) || 20;
    return db.healthSnapshots.slice(0, limit);
  }

  if (normPath === '/api/v1/model-health/evaluate' && normMethod === 'POST') {
    const windowSize = Number(body?.window_size) || 50;
    const snapshot = computeRollingHealthSnapshot(windowSize);
    db.addAuditLog({
      action: 'MODEL_EVALUATION',
      resource: 'model-health',
      outcome: 'SUCCESS',
      username: 'admin',
      ip_address: '127.0.0.1',
      details: `Evaluated health window of ${windowSize} samples. Resulting status: ${snapshot.status}`,
    });
    return snapshot;
  }

  if ((normPath === '/api/v1/model-health/drift-simulation' || normPath === '/api/v1/model-health/simulate-drift') && normMethod === 'POST') {
    const severity = body?.severity || 'moderate';
    const snapshot = simulateFeatureDrift(severity);
    db.addAuditLog({
      action: 'DRIFT_SIMULATION',
      resource: 'model-health',
      outcome: 'SUCCESS',
      username: 'admin',
      ip_address: '127.0.0.1',
      details: `Injected synthetic feature drift (severity: ${severity}). Max PSI: ${snapshot.drift.psi_max}`,
    });
    return snapshot;
  }

  // --- Alerts Endpoints ---
  if (normPath === '/api/v1/alerts' && normMethod === 'GET') {
    let list = [...db.alerts];
    const status = params.get('status');
    const severity = params.get('severity');
    const limit = Number(params.get('limit')) || 50;
    if (status) list = list.filter(a => a.status === status);
    if (severity) list = list.filter(a => a.severity === severity);
    return list.slice(0, limit);
  }

  const alertMatch = normPath.match(/^\/api\/v1\/alerts\/(\d+)$/);
  if (alertMatch && (normMethod === 'PATCH' || normMethod === 'PUT')) {
    const alertId = Number(alertMatch[1]);
    const alert = db.alerts.find(a => a.id === alertId);
    if (!alert) return { error: 'Alert not found' };

    const oldStatus = alert.status;
    alert.status = body?.status || alert.status;
    if (body?.status === 'resolved') {
      alert.resolved_by = 1;
      alert.resolved_at = new Date().toISOString();
    }
    db.addAuditLog({
      action: 'ALERT_CHANGE',
      resource: 'alerts',
      resource_id: String(alert.id),
      outcome: 'SUCCESS',
      username: 'analyst',
      ip_address: '127.0.0.1',
      details: `Alert #${alert.id} status changed from '${oldStatus}' to '${body?.status}'`,
    });
    return alert;
  }

  // --- Reviews Endpoints ---
  if (normPath === '/api/v1/reviews/queue' && normMethod === 'GET') {
    return db.cases
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
  }

  const reviewMatch = normPath.match(/^\/api\/v1\/reviews\/(\d+)$/);
  if (reviewMatch && normMethod === 'POST') {
    const caseId = Number(reviewMatch[1]);
    const targetCase = db.cases.find(c => c.id === caseId);
    if (!targetCase) return { error: 'Case not found' };
    if (targetCase.review) return { error: 'Case has already been reviewed' };

    const { decision, notes } = body || {};
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
    computeRollingHealthSnapshot(50);

    db.addAuditLog({
      action: 'HUMAN_REVIEW',
      resource: 'reviews',
      resource_id: String(caseId),
      outcome: 'SUCCESS',
      username: 'analyst',
      ip_address: '127.0.0.1',
      details: `Case #${caseId} reviewed. Ground truth: ${decision}. Health metrics re-computed.`,
    });

    return newReview;
  }

  // --- Robustness Scanner ---
  if (normPath === '/api/v1/scanner/run' && normMethod === 'POST') {
    const { n_samples = 50, noise_level = 0.10, target = 'all' } = body || {};
    const scanResult = runDefensiveRobustnessScan(n_samples, noise_level, target);
    db.addAuditLog({
      action: 'SCANNER_RUN',
      resource: 'scanner',
      outcome: 'SUCCESS',
      username: 'admin',
      ip_address: '127.0.0.1',
      details: `Admin ran robustness scan on ${n_samples} samples. Flip rate: ${(scanResult.flip_rate * 100).toFixed(1)}%`,
    });
    return scanResult;
  }

  // --- Config Endpoints ---
  if (normPath === '/api/v1/config/risk') {
    if (normMethod === 'GET') {
      return db.riskConfig;
    }
    if (normMethod === 'PUT' || normMethod === 'POST') {
      const { weights, uncertainty_bonuses, levels, reliability_weights } = body || {};
      if (weights) Object.assign(db.riskConfig.weights, weights);
      if (uncertainty_bonuses) Object.assign(db.riskConfig.uncertainty_bonuses, uncertainty_bonuses);
      if (levels) Object.assign(db.riskConfig.levels, levels);
      if (reliability_weights) Object.assign(db.riskConfig.reliability_weights, reliability_weights);

      db.addAuditLog({
        action: 'CONFIG_CHANGE',
        resource: 'risk_config',
        outcome: 'SUCCESS',
        username: 'admin',
        ip_address: '127.0.0.1',
        details: 'Admin updated risk engine weights and parameters.',
      });
      return { message: 'Risk configuration updated successfully', config: db.riskConfig };
    }
  }

  // --- Models Catalog ---
  if (normPath === '/api/v1/models') {
    return db.models;
  }

  // --- Audit Logs ---
  if (normPath === '/api/v1/audit-logs') {
    let list = [...db.auditLogs];
    const action = params.get('action');
    const limit = Number(params.get('limit')) || 50;
    const offset = Number(params.get('offset')) || 0;
    if (action) list = list.filter(l => l.action === action);
    return list.slice(offset, offset + limit);
  }

  return undefined;
}

/**
 * Installs transparent client-side fallback on window.fetch
 * If the backend API endpoint is unreachable (e.g. static hosting on Vercel, Netlify, GitHub Pages),
 * it seamlessly serves data from the in-memory engine.
 */
export function setupClientApiFallback() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let urlString = '';
    if (typeof input === 'string') {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.toString();
    } else if (input && typeof (input as Request).url === 'string') {
      urlString = (input as Request).url;
    }

    // Check if this request is targeting our API or health probe
    const isApiRequest = urlString.includes('/api/v1/') || urlString.includes('/health');

    if (isApiRequest) {
      try {
        const response = await originalFetch(input, init);
        const contentType = response.headers.get('content-type') || '';
        // If real backend responds with JSON and not an error status, return it!
        if (response.ok && contentType.includes('application/json')) {
          return response;
        }
      } catch (_err) {
        // Network error / server down - fallback to in-memory client engine
      }

      // Execute client-side mock/logic fallback
      try {
        const resolvedUrl = new URL(urlString, window.location.origin);
        const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
        let bodyData: any = undefined;

        if (init?.body && typeof init.body === 'string') {
          try {
            bodyData = JSON.parse(init.body);
          } catch {
            bodyData = init.body;
          }
        }

        const fallbackResult = handleClientApiRequest(
          resolvedUrl.pathname,
          method,
          bodyData,
          resolvedUrl.searchParams
        );

        if (fallbackResult !== undefined) {
          return new Response(JSON.stringify(fallbackResult), {
            status: 200,
            statusText: 'OK',
            headers: {
              'Content-Type': 'application/json',
              'X-Data-Source': 'Client-Side-Fallback',
            },
          });
        }
      } catch (fallbackError) {
        console.warn('Fallback execution error:', fallbackError);
      }
    }

    return originalFetch(input, init);
  };
}
