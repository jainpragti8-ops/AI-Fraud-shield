export type Role = 'admin' | 'analyst' | 'auditor';

export interface User {
  id: number;
  username: string;
  role: Role;
  isActive: boolean;
}

export type ImplLabel = 'REAL_ML' | 'RULE_BASED' | 'STATISTICAL' | 'MOCK' | 'FUTURE';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type ReliabilityLevel = 'High' | 'Medium' | 'Low';
export type CaseStatus = 'received' | 'preprocessed' | 'analysed' | 'in_review' | 'closed';

export interface DetectionOutput {
  module: string;
  label: ImplLabel;
  prediction: string;
  probability: number;
  confidence: number;
  details?: Record<string, any>;
}

export interface RiskBreakdownItem {
  signal: string;
  module: string;
  label: ImplLabel;
  raw_value: number;
  weight_pct: number;
  points_contributed: number;
}

export interface RiskOutput {
  score: number;
  level: RiskLevel;
  breakdown: RiskBreakdownItem[];
  explanation: string;
  base_score: number;
  ood_bonus: number;
  disagreement_bonus: number;
}

export interface ReliabilityOutput {
  score: number;
  level: ReliabilityLevel;
  mean_confidence: number;
  has_disagreement: boolean;
  is_ood: boolean;
  input_quality: number;
  flags: string[];
  trust_question: string;
  needs_human_review: boolean;
}

export interface TransactionInput {
  amount: number;
  hour_of_day: number;
  txn_count_24h: number;
  avg_amount_30d: number;
  amount_to_avg_ratio?: number;
  new_device: number;
  geo_distance_km: number;
  account_age_days: number;
  failed_logins_24h: number;
}

export interface IdentityInput {
  name_matches_id: boolean;
  device_known: boolean;
  location_plausible: boolean;
  contact_info_match: boolean;
}

export interface MediaFeaturesInput {
  voice_spectral_flatness?: number;
  face_landmark_jitter?: number;
  document_compression_artifacts?: number;
}

export interface CasePayload {
  text?: string;
  url?: string;
  transaction?: TransactionInput;
  identity?: IdentityInput;
  media_features?: MediaFeaturesInput;
}

export interface Case {
  id: number;
  created_at: string;
  created_by?: number;
  status: CaseStatus;
  risk_score: number;
  risk_level: RiskLevel;
  needs_human_review: boolean;
  reliability_score?: number;
  reliability_level?: ReliabilityLevel;
  content_hash: string;
  payload: CasePayload;
  detections: DetectionOutput[];
  risk_detail: RiskOutput;
  reliability_detail: ReliabilityOutput;
  review?: HumanReview;
}

export interface HumanReview {
  id: number;
  case_id: number;
  reviewed_by: number;
  reviewed_by_username: string;
  reviewed_at: string;
  decision: 'confirmed_fraud' | 'false_positive' | 'false_negative' | 'benign';
  ground_truth_label: 0 | 1;
  notes?: string;
}

export interface Alert {
  id: number;
  created_at: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  message: string;
  details?: Record<string, any>;
  case_id?: number;
  resolved_by?: number;
  resolved_at?: string;
}

export interface AuditLog {
  id: number;
  created_at: string;
  action: string;
  resource: string;
  resource_id?: string;
  outcome: 'SUCCESS' | 'FAILURE';
  user_id?: number;
  username: string;
  ip_address: string;
  details: string;
}

export interface SupervisedMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  fpr: number;
  fnr: number;
  confusion_matrix: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
}

export interface OperationalMetrics {
  mean_confidence: number;
  disagreement_rate: number;
  ood_rate: number;
  mean_latency_ms: number;
  error_rate: number;
}

export interface DriftMetrics {
  psi_max: number;
  ks_pvalue_min: number;
  drifted_features: Array<{
    feature: string;
    psi: number;
    ks_pvalue: number;
    drift_status: 'stable' | 'moderate' | 'significant';
  }>;
}

export interface TriggeredRule {
  id: string;
  metric: string;
  threshold: number;
  actual_value: number;
  operator: string;
  level: 'warning' | 'critical';
  message: string;
  recommendation: string;
}

export interface ModelHealthSnapshot {
  snapshot_id: number;
  model_version: string;
  window_size: number;
  labelled_samples: number;
  status: 'HEALTHY' | 'MODEL HEALTH ALERT' | 'POTENTIAL MODEL FAILURE / LOW RELIABILITY' | 'INSUFFICIENT_DATA';
  metrics: SupervisedMetrics;
  operational: OperationalMetrics;
  drift: DriftMetrics;
  rules_triggered: TriggeredRule[];
  created_at: string;
  note: string;
}

export interface ModelCatalogItem {
  id: number;
  name: string;
  version: string;
  algorithm: string;
  impl_label: ImplLabel;
  artifact_path: string;
  is_active: boolean;
  trained_at: string;
}

export interface RiskConfig {
  version: string;
  weights: Record<string, number>;
  uncertainty_bonuses: {
    ood_bonus: number;
    disagreement_bonus: number;
  };
  levels: {
    low: { min: number; max: number };
    medium: { min: number; max: number };
    high: { min: number; max: number };
    critical: { min: number; max: number };
  };
  reliability_thresholds: {
    high: number;
    medium: number;
  };
  reliability_weights: {
    confidence: number;
    agreement: number;
    ood: number;
    input_quality: number;
  };
  disclaimer: string;
}
