import {
  User,
  Case,
  Alert,
  HumanReview,
  AuditLog,
  ModelCatalogItem,
  RiskConfig,
  ModelHealthSnapshot
} from '../types';

export class MockDatabase {
  users: User[] = [
    { id: 1, username: 'admin', role: 'admin', isActive: true },
    { id: 2, username: 'analyst', role: 'analyst', isActive: true },
    { id: 3, username: 'auditor', role: 'auditor', isActive: true },
  ];

  models: ModelCatalogItem[] = [
    {
      id: 1,
      name: 'M1_Text_Phishing',
      version: 'v1.0.0',
      algorithm: 'LogisticRegression',
      impl_label: 'REAL_ML',
      artifact_path: 'backend/app/ml/artifacts/m1_text_logreg.joblib',
      is_active: true,
      trained_at: '2026-09-20T10:00:00Z',
    },
    {
      id: 2,
      name: 'M2_Text_Secondary',
      version: 'v1.0.0',
      algorithm: 'MultinomialNB',
      impl_label: 'REAL_ML',
      artifact_path: 'backend/app/ml/artifacts/m2_text_secondary.joblib',
      is_active: true,
      trained_at: '2026-09-20T10:05:00Z',
    },
    {
      id: 3,
      name: 'M3_Tabular_Fraud',
      version: 'v1.0.0',
      algorithm: 'RandomForest',
      impl_label: 'REAL_ML',
      artifact_path: 'backend/app/ml/artifacts/m3_tabular_rf.joblib',
      is_active: true,
      trained_at: '2026-09-20T10:15:00Z',
    },
    {
      id: 4,
      name: 'M4_Tabular_ANN',
      version: 'v1.0.0',
      algorithm: 'MLPClassifier',
      impl_label: 'REAL_ML',
      artifact_path: 'backend/app/ml/artifacts/m4_tabular_mlp.joblib',
      is_active: true,
      trained_at: '2026-09-20T10:20:00Z',
    },
    {
      id: 5,
      name: 'M5_Anomaly_Detector',
      version: 'v1.0.0',
      algorithm: 'IsolationForest',
      impl_label: 'REAL_ML',
      artifact_path: 'backend/app/ml/artifacts/m5_anomaly_isoforest.joblib',
      is_active: true,
      trained_at: '2026-09-20T10:30:00Z',
    },
    {
      id: 6,
      name: 'M6_OOD_Distance',
      version: 'v1.0.0',
      algorithm: 'NearestNeighbors',
      impl_label: 'REAL_ML',
      artifact_path: 'backend/app/ml/artifacts/m6_ood_knn.joblib',
      is_active: true,
      trained_at: '2026-09-20T10:35:00Z',
    },
    {
      id: 7,
      name: 'M_Voice_Forensics',
      version: 'v1.0.0',
      algorithm: 'PitchVarianceHeuristic',
      impl_label: 'MOCK',
      artifact_path: 'stub',
      is_active: true,
      trained_at: '2026-09-20T10:40:00Z',
    },
    {
      id: 8,
      name: 'M_Face_Forensics',
      version: 'v1.0.0',
      algorithm: 'BlinkRateHeuristic',
      impl_label: 'MOCK',
      artifact_path: 'stub',
      is_active: true,
      trained_at: '2026-09-20T10:40:00Z',
    },
    {
      id: 9,
      name: 'M_Doc_Forensics',
      version: 'v1.0.0',
      algorithm: 'OCRConsistencyHeuristic',
      impl_label: 'MOCK',
      artifact_path: 'stub',
      is_active: true,
      trained_at: '2026-09-20T10:40:00Z',
    },
  ];

  riskConfig: RiskConfig = {
    version: '1.0.0',
    weights: {
      text_phishing: 0.25,
      tabular_fraud: 0.25,
      anomaly: 0.15,
      url_suspicion: 0.10,
      identity_inconsistency: 0.10,
      behaviour_signal: 0.05,
      voice_mock: 0.03,
      face_mock: 0.03,
      document_mock: 0.04,
    },
    uncertainty_bonuses: {
      ood_bonus: 6,
      disagreement_bonus: 3,
    },
    levels: {
      low: { min: 0, max: 30 },
      medium: { min: 31, max: 60 },
      high: { min: 61, max: 80 },
      critical: { min: 81, max: 100 },
    },
    reliability_thresholds: {
      high: 0.75,
      medium: 0.55,
    },
    reliability_weights: {
      confidence: 0.35,
      agreement: 0.30,
      ood: 0.20,
      input_quality: 0.15,
    },
    disclaimer: 'Thresholds require validation on representative data. Academic prototype.',
  };

  cases: Case[] = [];
  reviews: HumanReview[] = [];
  alerts: Alert[] = [];
  auditLogs: AuditLog[] = [];
  healthSnapshots: ModelHealthSnapshot[] = [];

  private nextCaseId = 1;
  private nextAlertId = 1;
  private nextReviewId = 1;
  private nextAuditId = 1;
  private nextSnapshotId = 1;

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed demo cases
    const seedCasesData: Array<{
      text?: string;
      url?: string;
      txn?: any;
      idObj?: any;
      score: number;
      level: 'Low' | 'Medium' | 'High' | 'Critical';
      status: 'received' | 'analysed' | 'in_review' | 'closed';
      needsReview: boolean;
      reliability: number;
      relLevel: 'High' | 'Medium' | 'Low';
      reviewDecision?: 'confirmed_fraud' | 'false_positive' | 'false_negative' | 'benign';
    }> = [
        {
          text: 'Your grocery delivery order #84920 has been completed. Thank you for shopping with us.',
          url: 'https://groceries.freshmart.com/order/84920',
          txn: {
            amount: 28.95,
            hour_of_day: 13,
            txn_count_24h: 3,
            avg_amount_30d: 29.06,
            amount_to_avg_ratio: 0.996,
            new_device: 0,
            geo_distance_km: 4.1,
            account_age_days: 1202,
            failed_logins_24h: 0,
          },
          idObj: {
            name_matches_id: true,
            device_known: true,
            location_plausible: true,
            contact_info_match: true,
          },
          score: 12,
          level: 'Low',
          status: 'analysed',
          needsReview: false,
          reliability: 0.92,
          relLevel: 'High',
          reviewDecision: 'benign',
        },
        {
          text: 'Payment of $145.00 for hotel reservation in Chicago, IL. Please confirm via account dashboard.',
          url: 'https://secure-travel.hotelbooking.com/manage',
          txn: {
            amount: 145.00,
            hour_of_day: 21,
            txn_count_24h: 5,
            avg_amount_30d: 78.50,
            amount_to_avg_ratio: 1.84,
            new_device: 0,
            geo_distance_km: 320.5,
            account_age_days: 410,
            failed_logins_24h: 1,
          },
          idObj: {
            name_matches_id: true,
            device_known: true,
            location_plausible: false,
            contact_info_match: true,
          },
          score: 45,
          level: 'Medium',
          status: 'in_review',
          needsReview: true,
          reliability: 0.68,
          relLevel: 'Medium',
        },
        {
          text: 'SECURITY ALERT: Urgent wire transfer of $1,569.05 requested. Confirm OTP or account will be locked: http://bank-wire-portal.online',
          url: 'http://bank-wire-portal.online/login?auth=token994',
          txn: {
            amount: 1569.05,
            hour_of_day: 2,
            txn_count_24h: 12,
            avg_amount_30d: 111.04,
            amount_to_avg_ratio: 14.13,
            new_device: 1,
            geo_distance_km: 663.8,
            account_age_days: 49,
            failed_logins_24h: 3,
          },
          idObj: {
            name_matches_id: false,
            device_known: false,
            location_plausible: false,
            contact_info_match: false,
          },
          score: 84,
          level: 'Critical',
          status: 'in_review',
          needsReview: true,
          reliability: 0.81,
          relLevel: 'High',
          reviewDecision: 'confirmed_fraud',
        },
        {
          text: 'Dear Customer, unusual activity detected. Download the security update attachment to restore full banking features.',
          url: 'http://192.168.1.88@chase-security-verify.top/download',
          txn: {
            amount: 890.00,
            hour_of_day: 3,
            txn_count_24h: 8,
            avg_amount_30d: 95.00,
            amount_to_avg_ratio: 9.36,
            new_device: 1,
            geo_distance_km: 412.0,
            account_age_days: 12,
            failed_logins_24h: 4,
          },
          idObj: {
            name_matches_id: true,
            device_known: false,
            location_plausible: false,
            contact_info_match: false,
          },
          score: 93,
          level: 'Critical',
          status: 'in_review',
          needsReview: true,
          reliability: 0.78,
          relLevel: 'High',
        },
        {
          text: 'Hi Sarah, lunch was great! Here is the link to the recipe we talked about.',
          url: 'https://recipes.epicurious.com/pasta-pomodoro',
          txn: {
            amount: 34.20,
            hour_of_day: 14,
            txn_count_24h: 2,
            avg_amount_30d: 40.00,
            amount_to_avg_ratio: 0.855,
            new_device: 0,
            geo_distance_km: 5.0,
            account_age_days: 890,
            failed_logins_24h: 0,
          },
          idObj: {
            name_matches_id: true,
            device_known: true,
            location_plausible: true,
            contact_info_match: true,
          },
          score: 8,
          level: 'Low',
          status: 'analysed',
          needsReview: false,
          reliability: 0.95,
          relLevel: 'High',
          reviewDecision: 'benign',
        },
        {
          text: 'Crypto exchange notification: withdrawal of 0.45 BTC initiated from new IP address.',
          url: 'https://binance-secure-login-attempt.club/confirm',
          txn: {
            amount: 450.00,
            hour_of_day: 4,
            txn_count_24h: 7,
            avg_amount_30d: 120.00,
            amount_to_avg_ratio: 3.75,
            new_device: 1,
            geo_distance_km: 850.0,
            account_age_days: 65,
            failed_logins_24h: 2,
          },
          idObj: {
            name_matches_id: true,
            device_known: false,
            location_plausible: false,
            contact_info_match: true,
          },
          score: 72,
          level: 'High',
          status: 'in_review',
          needsReview: true,
          reliability: 0.62,
          relLevel: 'Medium',
        },
      ];

    seedCasesData.forEach((sc, idx) => {
      const caseId = this.nextCaseId++;
      const createdTime = new Date(Date.now() - (6 - idx) * 3600000 * 4).toISOString();
      const newCase: Case = {
        id: caseId,
        created_at: createdTime,
        created_by: 1,
        status: sc.status,
        risk_score: sc.score,
        risk_level: sc.level,
        needs_human_review: sc.needsReview,
        reliability_score: sc.reliability,
        reliability_level: sc.relLevel,
        content_hash: 'hash_' + Math.random().toString(36).substring(2, 12),
        payload: {
          text: sc.text,
          url: sc.url,
          transaction: sc.txn,
          identity: sc.idObj,
          media_features: {
            voice_spectral_flatness: 0.12,
            face_landmark_jitter: 0.08,
            document_compression_artifacts: 0.15,
          },
        },
        detections: [
          {
            module: 'text',
            label: 'REAL_ML',
            prediction: sc.score > 50 ? 'phishing_suspicious' : 'benign',
            probability: sc.score > 50 ? 0.88 : 0.08,
            confidence: 0.88,
            details: { model: 'M1_LogisticRegression', agreement: true },
          },
          {
            module: 'tabular',
            label: 'REAL_ML',
            prediction: sc.score > 50 ? 'fraud' : 'non_fraud',
            probability: sc.score > 50 ? 0.82 : 0.05,
            confidence: 0.85,
            details: { model: 'M3_RandomForest', agreement: true },
          },
          {
            module: 'url',
            label: 'RULE_BASED',
            prediction: sc.url?.includes('online') || sc.url?.includes('club') ? 'suspicious' : 'clean',
            probability: sc.url?.includes('online') || sc.url?.includes('club') ? 0.75 : 0.05,
            confidence: 1.0,
            details: { triggered_rules: sc.url?.includes('online') ? ['HIGH_RISK_TLD', 'SUSPICIOUS_KEYWORD'] : [] },
          },
          {
            module: 'identity',
            label: 'RULE_BASED',
            prediction: sc.idObj.device_known ? 'consistent' : 'inconsistent',
            probability: sc.idObj.device_known ? 0.05 : 0.65,
            confidence: 1.0,
            details: { triggered_checks: sc.idObj.device_known ? [] : ['UNKNOWN_DEVICE', 'IMPLAUSIBLE_LOCATION'] },
          },
          {
            module: 'anomaly_ood',
            label: 'REAL_ML',
            prediction: sc.score > 70 ? 'anomaly' : 'normal',
            probability: sc.score > 70 ? 0.75 : 0.12,
            confidence: 0.82,
            details: { is_ood: sc.score > 80, knn_distance: sc.score > 80 ? 2.85 : 0.95 },
          },
        ],
        risk_detail: {
          score: sc.score,
          level: sc.level,
          base_score: sc.score > 80 ? sc.score - 6 : sc.score,
          ood_bonus: sc.score > 80 ? 6 : 0,
          disagreement_bonus: 0,
          explanation: `Multi-signal risk evaluation: ${sc.level} severity determined from text, tabular, and behavioral heuristics.`,
          breakdown: [
            { signal: 'text_phishing', module: 'text', label: 'REAL_ML', raw_value: sc.score > 50 ? 0.88 : 0.08, weight_pct: 25, points_contributed: sc.score > 50 ? 22 : 2 },
            { signal: 'tabular_fraud', module: 'tabular', label: 'REAL_ML', raw_value: sc.score > 50 ? 0.82 : 0.05, weight_pct: 25, points_contributed: sc.score > 50 ? 20.5 : 1.2 },
            { signal: 'anomaly', module: 'anomaly_ood', label: 'REAL_ML', raw_value: sc.score > 70 ? 0.75 : 0.12, weight_pct: 15, points_contributed: sc.score > 70 ? 11.25 : 1.8 },
            { signal: 'url_suspicion', module: 'url', label: 'RULE_BASED', raw_value: 0.2, weight_pct: 10, points_contributed: 2 },
            { signal: 'identity_inconsistency', module: 'identity', label: 'RULE_BASED', raw_value: sc.idObj.device_known ? 0 : 0.65, weight_pct: 10, points_contributed: sc.idObj.device_known ? 0 : 6.5 },
          ],
        },
        reliability_detail: {
          score: sc.reliability,
          level: sc.relLevel,
          mean_confidence: 0.85,
          has_disagreement: false,
          is_ood: sc.score > 80,
          input_quality: 0.95,
          flags: sc.score > 80 ? ['OUT_OF_DISTRIBUTION'] : ['NONE'],
          trust_question: sc.relLevel === 'High'
            ? 'Can I trust the AI decision? Yes — high model confidence, strong agreement, and in-distribution input.'
            : 'Can I trust the AI decision? Moderately — human review recommended for high value cases.',
          needs_human_review: sc.needsReview,
        },
      };

      if (sc.reviewDecision) {
        const review: HumanReview = {
          id: this.nextReviewId++,
          case_id: caseId,
          reviewed_by: 2,
          reviewed_by_username: 'analyst',
          reviewed_at: new Date(Date.now() - (5 - idx) * 3600000).toISOString(),
          decision: sc.reviewDecision,
          ground_truth_label: sc.reviewDecision === 'confirmed_fraud' || sc.reviewDecision === 'false_negative' ? 1 : 0,
          notes: `Analyst verified: ${sc.reviewDecision.replace('_', ' ')}.`,
        };
        newCase.review = review;
        this.reviews.push(review);
      }

      this.cases.push(newCase);
    });

    // Seed alerts
    this.alerts = [
      {
        id: this.nextAlertId++,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        alert_type: 'CRITICAL_RISK_CASE',
        severity: 'critical',
        status: 'open',
        message: 'Critical risk case detected (Score: 93). Urgent investigation required.',
        details: { case_id: 4, trigger: 'Phishing domain match + high transaction amount' },
        case_id: 4,
      },
      {
        id: this.nextAlertId++,
        created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
        alert_type: 'DRIFT_WARNING',
        severity: 'warning',
        status: 'acknowledged',
        message: 'Moderate feature drift detected on geo_distance_km (PSI: 0.142).',
        details: { feature: 'geo_distance_km', psi: 0.142, threshold: 0.10 },
      },
      {
        id: this.nextAlertId++,
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        alert_type: 'MODEL_DISAGREEMENT',
        severity: 'warning',
        status: 'resolved',
        message: 'Primary Random Forest and Secondary ANN model diverged on Case #2.',
        details: { case_id: 2, rf_prob: 0.72, ann_prob: 0.38 },
        case_id: 2,
        resolved_by: 1,
        resolved_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      },
    ];

    // Seed audit logs
    this.auditLogs = [
      {
        id: this.nextAuditId++,
        created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
        action: 'SYSTEM_BOOT',
        resource: 'system',
        outcome: 'SUCCESS',
        username: 'system',
        ip_address: '127.0.0.1',
        details: 'AI FraudShield platform initialized. 9 model versions registered.',
      },
      {
        id: this.nextAuditId++,
        created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        action: 'LOGIN',
        resource: 'auth',
        outcome: 'SUCCESS',
        user_id: 1,
        username: 'admin',
        ip_address: '127.0.0.1',
        details: 'Admin user authenticated via JWT.',
      },
      {
        id: this.nextAuditId++,
        created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
        action: 'HUMAN_REVIEW',
        resource: 'cases',
        resource_id: '3',
        outcome: 'SUCCESS',
        user_id: 2,
        username: 'analyst',
        ip_address: '127.0.0.1',
        details: 'Analyst reviewed Case #3 with decision confirmed_fraud.',
      },
      {
        id: this.nextAuditId++,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        action: 'ALERT_CHANGE',
        resource: 'alerts',
        resource_id: '2',
        outcome: 'SUCCESS',
        user_id: 2,
        username: 'analyst',
        ip_address: '127.0.0.1',
        details: 'Alert #2 status changed to acknowledged.',
      },
    ];

    // Seed health snapshot
    this.healthSnapshots = [
      {
        snapshot_id: this.nextSnapshotId++,
        model_version: 'v1.0.0',
        window_size: 50,
        labelled_samples: 42,
        status: 'HEALTHY',
        metrics: {
          accuracy: 0.928,
          precision: 0.912,
          recall: 0.895,
          f1: 0.903,
          fpr: 0.042,
          fnr: 0.105,
          confusion_matrix: {
            tp: 17,
            fp: 1,
            fn: 2,
            tn: 22,
          },
        },
        operational: {
          mean_confidence: 0.874,
          disagreement_rate: 0.071,
          ood_rate: 0.048,
          mean_latency_ms: 18.5,
          error_rate: 0.0,
        },
        drift: {
          psi_max: 0.084,
          ks_pvalue_min: 0.42,
          drifted_features: [
            { feature: 'amount', psi: 0.052, ks_pvalue: 0.65, drift_status: 'stable' },
            { feature: 'hour_of_day', psi: 0.038, ks_pvalue: 0.78, drift_status: 'stable' },
            { feature: 'geo_distance_km', psi: 0.084, ks_pvalue: 0.42, drift_status: 'stable' },
            { feature: 'failed_logins_24h', psi: 0.041, ks_pvalue: 0.81, drift_status: 'stable' },
          ],
        },
        rules_triggered: [],
        created_at: new Date().toISOString(),
        note: 'Thresholds require validation on representative data.',
      },
    ];
  }

  addUser(u: Omit<User, 'id'>): User {
    const newUser: User = {
      ...u,
      id: this.users.length + 1,
    };
    this.users.push(newUser);
    return newUser;
  }

  addCase(c: Omit<Case, 'id'>): Case {
    const newCase: Case = {
      ...c,
      id: this.nextCaseId++,
    };
    this.cases.unshift(newCase);
    return newCase;
  }

  addAlert(a: Omit<Alert, 'id' | 'created_at'>): Alert {
    const newAlert: Alert = {
      ...a,
      id: this.nextAlertId++,
      created_at: new Date().toISOString(),
    };
    this.alerts.unshift(newAlert);
    return newAlert;
  }

  addReview(r: Omit<HumanReview, 'id' | 'reviewed_at'>): HumanReview {
    const newReview: HumanReview = {
      ...r,
      id: this.nextReviewId++,
      reviewed_at: new Date().toISOString(),
    };
    this.reviews.unshift(newReview);
    return newReview;
  }

  addAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const entry: AuditLog = {
      ...log,
      id: this.nextAuditId++,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(entry);
    return entry;
  }

  addHealthSnapshot(s: Omit<ModelHealthSnapshot, 'snapshot_id' | 'created_at'>): ModelHealthSnapshot {
    const snapshot: ModelHealthSnapshot = {
      ...s,
      snapshot_id: this.nextSnapshotId++,
      created_at: new Date().toISOString(),
    };
    this.healthSnapshots.unshift(snapshot);
    return snapshot;
  }
}

export const db = new MockDatabase();
