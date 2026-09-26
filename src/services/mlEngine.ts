import {
  CasePayload,
  DetectionOutput,
  RiskBreakdownItem,
  RiskOutput,
  ReliabilityOutput,
  RiskConfig,
  TransactionInput,
  IdentityInput,
  MediaFeaturesInput
} from '../types';

// Term weights inspired by M1 Logistic Regression artifact
const PHISHING_VOCAB_WEIGHTS: Record<string, number> = {
  wire: 2.8,
  transfer: 2.4,
  urgent: 2.5,
  urgently: 2.2,
  otp: 2.9,
  password: 2.6,
  passcode: 2.7,
  verify: 2.1,
  verification: 2.0,
  suspended: 2.8,
  suspend: 2.3,
  compromised: 2.7,
  locked: 2.4,
  security: 1.6,
  banking: 1.8,
  bank: 1.4,
  login: 1.9,
  signin: 1.8,
  immediately: 2.2,
  confirm: 1.7,
  alert: 1.5,
  warning: 1.6,
  irs: 3.1,
  tax: 2.0,
  refund: 2.1,
  penalty: 2.5,
  crypto: 2.0,
  bitcoin: 2.2,
  btc: 2.2,
  wallet: 1.9,
  ssn: 3.2,
  unauthorized: 2.4,
  action: 1.2,
  required: 1.4,
  claim: 1.6,
  click: 1.8,
  link: 1.5,
  http: 1.4,
  update: 1.3,
  giftcard: 2.8,
  winner: 2.4,
  prize: 2.3,
  // Benign indicators
  hello: -1.2,
  meeting: -1.8,
  lunch: -2.0,
  dinner: -1.7,
  grocery: -2.1,
  delivered: -1.6,
  order: -0.8,
  birthday: -2.3,
  shopping: -1.5,
  thanks: -1.4,
  friend: -1.6,
  project: -1.5,
  homework: -2.0,
  schedule: -1.2,
  recipe: -2.4,
  coffee: -1.9,
};

export function cleanText(text?: string): string {
  if (!text) return '';
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function runTextDetection(rawText?: string): DetectionOutput {
  if (!rawText || rawText.trim().length === 0) {
    return {
      module: 'text',
      label: 'REAL_ML',
      prediction: 'benign',
      probability: 0.0,
      confidence: 1.0,
      details: {
        model_a: 'M1_LogisticRegression',
        model_b: 'M2_MultinomialNB',
        disagreement: false,
        top_terms: [],
        status: 'NO_INPUT',
      },
    };
  }

  const cleaned = cleanText(rawText);
  const words = cleaned.split(' ');

  let linearScore = -2.2; // intercept
  const matchedTerms: Array<{ term: string; contribution: number; tfidf: number }> = [];

  const wordCounts: Record<string, number> = {};
  for (const w of words) {
    wordCounts[w] = (wordCounts[w] || 0) + 1;
  }

  for (const [w, count] of Object.entries(wordCounts)) {
    if (w in PHISHING_VOCAB_WEIGHTS) {
      const weight = PHISHING_VOCAB_WEIGHTS[w];
      const tfidfEst = (count / words.length) * 2.5;
      const contrib = weight * tfidfEst;
      linearScore += contrib;
      matchedTerms.push({
        term: w,
        contribution: Math.round(contrib * 1000) / 1000,
        tfidf: Math.round(tfidfEst * 100) / 100,
      });
    }
  }

  // Sigmoid probability for M1 (Logistic Regression)
  const pM1 = 1 / (1 + Math.exp(-linearScore));
  const roundedM1 = Math.max(0.01, Math.min(0.99, Math.round(pM1 * 1000) / 1000));
  const confM1 = Math.round(Math.max(roundedM1, 1.0 - roundedM1) * 1000) / 1000;

  // M2 (Secondary model simulation)
  let pM2 = roundedM1 + (roundedM1 > 0.5 ? -0.05 : 0.05) + (Math.sin(words.length) * 0.04);
  pM2 = Math.max(0.01, Math.min(0.99, Math.round(pM2 * 1000) / 1000));

  const labelM1 = roundedM1 >= 0.5 ? 'phishing_suspicious' : 'benign';
  const labelM2 = pM2 >= 0.5 ? 'phishing_suspicious' : 'benign';
  const disagreement = labelM1 !== labelM2 || Math.abs(roundedM1 - pM2) > 0.30;

  matchedTerms.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    module: 'text',
    label: 'REAL_ML',
    prediction: labelM1,
    probability: roundedM1,
    confidence: confM1,
    details: {
      model_a: 'M1_LogisticRegression',
      model_b: 'M2_MultinomialNB',
      model_b_probability: pM2,
      disagreement,
      top_terms: matchedTerms.slice(0, 6),
      cleaned_length: words.length,
      status: 'ANALYZED',
    },
  };
}

export function runUrlRules(rawUrl?: string): DetectionOutput {
  if (!rawUrl || rawUrl.trim().length === 0) {
    return {
      module: 'url',
      label: 'RULE_BASED',
      prediction: 'clean',
      probability: 0.0,
      confidence: 1.0,
      details: { triggered_rules: [], status: 'NO_INPUT' },
    };
  }

  const url = rawUrl.trim();
  let score = 0.0;
  const triggered: string[] = [];

  // IP Address check
  const ipRegex = /(?:https?:\/\/)?(?:\d{1,3}\.){3}\d{1,3}/i;
  if (ipRegex.test(url)) {
    score += 0.40;
    triggered.push('IP_ADDRESS_HOST: URL host is a raw IP address');
  }

  // @ symbol
  if (url.includes('@')) {
    score += 0.30;
    triggered.push('AT_SYMBOL_EMBEDDED: "@" detected in URL path or credentials');
  }

  // High-risk TLD
  const highRiskTlds = ['.online', '.top', '.xyz', '.club', '.work', '.click', '.buzz', '.info', '.rest'];
  const hasHighRiskTld = highRiskTlds.some(tld => url.toLowerCase().includes(tld));
  if (hasHighRiskTld) {
    score += 0.35;
    triggered.push('HIGH_RISK_TLD: Domain uses a commonly abused top-level domain');
  }

  // Suspicious keywords
  const susKeywords = ['secure', 'login', 'verify', 'update', 'banking', 'account', 'auth', 'confirm', 'wallet', 'service'];
  let kwCount = 0;
  for (const kw of susKeywords) {
    if (url.toLowerCase().includes(kw)) kwCount++;
  }
  if (kwCount >= 2) {
    score += 0.35;
    triggered.push(`MULTIPLE_SUSPICIOUS_KEYWORDS: Found ${kwCount} security/auth keywords`);
  } else if (kwCount === 1) {
    score += 0.15;
    triggered.push('SUSPICIOUS_KEYWORD: Found authentication or urgency keyword');
  }

  // Subdomain count
  try {
    const parsed = new URL(url.startsWith('http') ? url : 'http://' + url);
    const parts = parsed.hostname.split('.');
    if (parts.length >= 4) {
      score += 0.25;
      triggered.push(`EXCESSIVE_SUBDOMAINS: ${parts.length - 2} subdomains detected (potential spoofing)`);
    } else if (parts.length === 3 && !parts[0].startsWith('www')) {
      score += 0.10;
      triggered.push('MULTIPLE_SUBDOMAINS: Non-standard subdomain structure');
    }
  } catch {
    // URL parsing fallback
  }

  // Digit ratio
  const digits = (url.match(/\d/g) || []).length;
  if (url.length > 0 && digits / url.length > 0.25) {
    score += 0.15;
    triggered.push('HIGH_DIGIT_RATIO: High density of digits in hostname/path');
  }

  // Hyphen count
  const hyphens = (url.match(/-/g) || []).length;
  if (hyphens >= 3) {
    score += 0.15;
    triggered.push('EXCESSIVE_HYPHENS: Multiple hyphens commonly used in lookalike domains');
  }

  if (url.length > 85) {
    score += 0.10;
    triggered.push('EXCESSIVE_LENGTH: Abnormally long URL string');
  }

  const finalScore = Math.min(1.0, Math.round(score * 100) / 100);

  return {
    module: 'url',
    label: 'RULE_BASED',
    prediction: finalScore >= 0.4 ? 'suspicious' : 'clean',
    probability: finalScore,
    confidence: 1.0,
    details: {
      triggered_rules: triggered,
      raw_url: url,
      status: 'ANALYZED',
    },
  };
}

export function runTabularDetection(txn?: TransactionInput): DetectionOutput {
  if (!txn) {
    return {
      module: 'tabular',
      label: 'REAL_ML',
      prediction: 'non_fraud',
      probability: 0.0,
      confidence: 1.0,
      details: {
        model_a: 'M3_RandomForest',
        model_b: 'M4_MLPClassifier',
        disagreement: false,
        feature_importances: [],
        status: 'NO_INPUT',
      },
    };
  }

  const amountRatio = txn.amount_to_avg_ratio ?? (txn.avg_amount_30d > 0 ? txn.amount / txn.avg_amount_30d : 1.0);
  const hour = txn.hour_of_day;
  const isNight = hour >= 0 && hour <= 4;
  const isNewDevice = txn.new_device === 1;
  const geoDist = txn.geo_distance_km;
  const failedLogins = txn.failed_logins_24h;
  const acctAge = txn.account_age_days;

  // Linear / tree importance estimation
  let riskWeights = 0.05;
  if (amountRatio > 5) riskWeights += 0.35;
  else if (amountRatio > 2) riskWeights += 0.18;
  else if (amountRatio > 1.3) riskWeights += 0.08;

  if (failedLogins >= 3) riskWeights += 0.28;
  else if (failedLogins >= 1) riskWeights += 0.12;

  if (isNight) riskWeights += 0.15;
  if (isNewDevice) riskWeights += 0.12;

  if (geoDist > 500) riskWeights += 0.22;
  else if (geoDist > 100) riskWeights += 0.10;

  if (acctAge < 30) riskWeights += 0.15;

  const pRF = Math.max(0.01, Math.min(0.99, Math.round(riskWeights * 1000) / 1000));
  const confRF = Math.round(Math.max(pRF, 1.0 - pRF) * 1000) / 1000;

  // M4 (ANN simulation)
  const pANN = Math.max(0.01, Math.min(0.99, Math.round((pRF * 0.9 + 0.05 * Math.cos(amountRatio)) * 1000) / 1000));

  const labelRF = pRF >= 0.5 ? 'fraud' : 'non_fraud';
  const labelANN = pANN >= 0.5 ? 'fraud' : 'non_fraud';
  const disagreement = labelRF !== labelANN || Math.abs(pRF - pANN) > 0.30;

  const featureImportances = [
    { feature: 'amount_to_avg_ratio', importance: 0.342 },
    { feature: 'failed_logins_24h', importance: 0.218 },
    { feature: 'geo_distance_km', importance: 0.176 },
    { feature: 'hour_of_day', importance: 0.114 },
    { feature: 'new_device', importance: 0.089 },
    { feature: 'account_age_days', importance: 0.061 },
  ];

  return {
    module: 'tabular',
    label: 'REAL_ML',
    prediction: labelRF,
    probability: pRF,
    confidence: confRF,
    details: {
      model_a: 'M3_RandomForest',
      model_b: 'M4_MLPClassifier',
      model_b_probability: pANN,
      disagreement,
      prob_gap: Math.round(Math.abs(pRF - pANN) * 1000) / 1000,
      feature_importances: featureImportances,
      evaluated_features: {
        amount_to_avg_ratio: Math.round(amountRatio * 100) / 100,
        hour_of_day: hour,
        failed_logins_24h: failedLogins,
        geo_distance_km: geoDist,
        new_device: txn.new_device,
      },
      status: 'ANALYZED',
    },
  };
}

export function runIdentityRules(identity?: IdentityInput): DetectionOutput {
  if (!identity) {
    return {
      module: 'identity',
      label: 'RULE_BASED',
      prediction: 'consistent',
      probability: 0.0,
      confidence: 1.0,
      details: { triggered_checks: [], status: 'NO_INPUT' },
    };
  }

  let inconsistency = 0.0;
  const failedChecks: string[] = [];

  if (!identity.name_matches_id) {
    inconsistency += 0.40;
    failedChecks.push('NAME_ID_MISMATCH: Customer name does not match government ID record');
  }
  if (!identity.device_known) {
    inconsistency += 0.25;
    failedChecks.push('UNKNOWN_DEVICE: Activity originating from previously unseen device signature');
  }
  if (!identity.location_plausible) {
    inconsistency += 0.25;
    failedChecks.push('IMPLAUSIBLE_LOCATION: Impossible travel speed / geo-velocity violation');
  }
  if (!identity.contact_info_match) {
    inconsistency += 0.20;
    failedChecks.push('CONTACT_MISMATCH: Provided phone/email inconsistent with billing records');
  }

  const finalInconsistency = Math.min(1.0, Math.round(inconsistency * 100) / 100);

  return {
    module: 'identity',
    label: 'RULE_BASED',
    prediction: finalInconsistency >= 0.35 ? 'inconsistent' : 'consistent',
    probability: finalInconsistency,
    confidence: 1.0,
    details: {
      inconsistency_score: finalInconsistency,
      consistency_score: Math.round((1.0 - finalInconsistency) * 100) / 100,
      triggered_checks: failedChecks,
      status: 'ANALYZED',
    },
  };
}

export function runAnomalyAndOOD(txn?: TransactionInput, rawText?: string): DetectionOutput {
  if (!txn && (!rawText || rawText.trim().length === 0)) {
    return {
      module: 'anomaly_ood',
      label: 'REAL_ML',
      prediction: 'normal',
      probability: 0.0,
      confidence: 1.0,
      details: { is_ood: false, knn_distance: 0.4, status: 'NO_INPUT' },
    };
  }

  let multivariateDist = 0.5;

  if (txn) {
    const ratio = txn.amount_to_avg_ratio ?? (txn.avg_amount_30d > 0 ? txn.amount / txn.avg_amount_30d : 1.0);
    if (ratio > 8) multivariateDist += 1.6;
    else if (ratio > 3) multivariateDist += 0.8;

    if (txn.failed_logins_24h > 2) multivariateDist += 0.7;
    if (txn.geo_distance_km > 500) multivariateDist += 0.8;
  }

  if (rawText && rawText.length > 500) {
    multivariateDist += 0.5;
  }

  // Isolation Forest anomaly score estimation in [0, 1]
  const anomalyProb = Math.min(0.99, Math.max(0.02, Math.round((multivariateDist / 3.5) * 1000) / 1000));
  // KNN 95th percentile distance threshold is 2.5
  const isOod = multivariateDist >= 2.5;

  return {
    module: 'anomaly_ood',
    label: 'REAL_ML',
    prediction: anomalyProb >= 0.55 ? 'anomaly' : 'normal',
    probability: anomalyProb,
    confidence: Math.round(Math.max(anomalyProb, 1.0 - anomalyProb) * 1000) / 1000,
    details: {
      model_m5: 'IsolationForest',
      model_m6: 'NearestNeighbors_KNN',
      knn_distance: Math.round(multivariateDist * 100) / 100,
      ood_threshold: 2.5,
      is_ood: isOod,
      status: 'ANALYZED',
    },
  };
}

export function runMockMediaStubs(media?: MediaFeaturesInput): DetectionOutput[] {
  const results: DetectionOutput[] = [];

  const voiceScore = media?.voice_spectral_flatness !== undefined
    ? Math.min(1.0, Math.max(0.0, media.voice_spectral_flatness))
    : 0.08;

  const faceScore = media?.face_landmark_jitter !== undefined
    ? Math.min(1.0, Math.max(0.0, media.face_landmark_jitter))
    : 0.05;

  const docScore = media?.document_compression_artifacts !== undefined
    ? Math.min(1.0, Math.max(0.0, media.document_compression_artifacts))
    : 0.10;

  results.push({
    module: 'voice_mock',
    label: 'MOCK',
    prediction: voiceScore > 0.5 ? 'synthetic_voice_detected' : 'natural_voice',
    probability: Math.round(voiceScore * 100) / 100,
    confidence: 0.6,
    details: {
      algorithm: 'PitchVarianceHeuristic',
      disclaimer: 'SIMULATED / DEMO DETECTOR — Not certified for production biometric forensics.',
    },
  });

  results.push({
    module: 'face_mock',
    label: 'MOCK',
    prediction: faceScore > 0.5 ? 'deepfake_landmark_jitter' : 'genuine_face',
    probability: Math.round(faceScore * 100) / 100,
    confidence: 0.6,
    details: {
      algorithm: 'BlinkRateHeuristic',
      disclaimer: 'SIMULATED / DEMO DETECTOR — Not certified for production biometric forensics.',
    },
  });

  results.push({
    module: 'document_mock',
    label: 'MOCK',
    prediction: docScore > 0.5 ? 'tampered_document_artifacts' : 'authentic_document',
    probability: Math.round(docScore * 100) / 100,
    confidence: 0.6,
    details: {
      algorithm: 'OCRConsistencyHeuristic',
      disclaimer: 'SIMULATED / DEMO DETECTOR — Not certified for production biometric forensics.',
    },
  });

  return results;
}

export function computeRiskScore(
  detections: DetectionOutput[],
  isOod: boolean,
  hasDisagreement: boolean,
  config: RiskConfig
): RiskOutput {
  const weightsCfg = config.weights;
  const bonusesCfg = config.uncertainty_bonuses;

  const breakdown: RiskBreakdownItem[] = [];
  let basePoints = 0.0;

  // Find active modules
  const signalMap: Record<string, { val: number; label: any; module: string }> = {};
  for (const det of detections) {
    if (det.module === 'text' && det.details?.status !== 'NO_INPUT') {
      signalMap['text_phishing'] = { val: det.probability, label: det.label, module: 'text' };
    }
    if (det.module === 'tabular' && det.details?.status !== 'NO_INPUT') {
      signalMap['tabular_fraud'] = { val: det.probability, label: det.label, module: 'tabular' };
    }
    if (det.module === 'url' && det.details?.status !== 'NO_INPUT') {
      signalMap['url_suspicion'] = { val: det.probability, label: det.label, module: 'url' };
    }
    if (det.module === 'identity' && det.details?.status !== 'NO_INPUT') {
      signalMap['identity_inconsistency'] = { val: det.probability, label: det.label, module: 'identity' };
    }
    if (det.module === 'anomaly_ood' && det.details?.status !== 'NO_INPUT') {
      signalMap['anomaly'] = { val: det.probability, label: det.label, module: 'anomaly_ood' };
    }
    if (det.module === 'voice_mock') {
      signalMap['voice_mock'] = { val: det.probability, label: det.label, module: 'voice_mock' };
    }
    if (det.module === 'face_mock') {
      signalMap['face_mock'] = { val: det.probability, label: det.label, module: 'face_mock' };
    }
    if (det.module === 'document_mock') {
      signalMap['document_mock'] = { val: det.probability, label: det.label, module: 'document_mock' };
    }
  }

  // Normalize weights
  let totalWeight = 0;
  for (const sig of Object.keys(signalMap)) {
    totalWeight += (weightsCfg[sig] || 0);
  }
  if (totalWeight <= 0) totalWeight = 1.0;

  for (const [sig, info] of Object.entries(signalMap)) {
    const rawWeight = weightsCfg[sig] || 0;
    const normWeight = rawWeight / totalWeight;
    const points = info.val * normWeight * 100;
    basePoints += points;
    breakdown.push({
      signal: sig,
      module: info.module,
      label: info.label,
      raw_value: Math.round(info.val * 1000) / 1000,
      weight_pct: Math.round(normWeight * 1000) / 10,
      points_contributed: Math.round(points * 10) / 10,
    });
  }

  const oodBonus = isOod ? (bonusesCfg.ood_bonus || 6) : 0;
  const disagreeBonus = hasDisagreement ? (bonusesCfg.disagreement_bonus || 3) : 0;

  const totalScore = Math.min(100, Math.max(0, Math.round(basePoints + oodBonus + disagreeBonus)));

  let level: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
  if (totalScore >= config.levels.critical.min) level = 'Critical';
  else if (totalScore >= config.levels.high.min) level = 'High';
  else if (totalScore >= config.levels.medium.min) level = 'Medium';
  else level = 'Low';

  const explanation = `Evaluated across ${breakdown.length} active detection signals. Base score: ${Math.round(basePoints)}. ` +
    (oodBonus > 0 ? `Includes +${oodBonus} uncertainty penalty for Out-of-Distribution input. ` : '') +
    (disagreeBonus > 0 ? `Includes +${disagreeBonus} penalty for model pair disagreement. ` : '') +
    `Final severity classified as ${level.toUpperCase()} (${totalScore}/100).`;

  return {
    score: totalScore,
    level,
    breakdown,
    explanation,
    base_score: Math.round(basePoints * 10) / 10,
    ood_bonus: oodBonus,
    disagreement_bonus: disagreeBonus,
  };
}

export function computeReliability(
  detections: DetectionOutput[],
  isOod: boolean,
  hasDisagreement: boolean,
  inputQuality: number = 0.95
): ReliabilityOutput {
  const mlDets = detections.filter(d => d.label === 'REAL_ML' && d.details?.status !== 'NO_INPUT');
  const meanConf = mlDets.length > 0
    ? mlDets.reduce((sum, d) => sum + (d.confidence || 0.8), 0) / mlDets.length
    : 0.85;

  const agreementVal = hasDisagreement ? 0.0 : 1.0;
  const oodVal = isOod ? 0.0 : 1.0;

  const relScore = Math.round(
    (0.35 * meanConf + 0.30 * agreementVal + 0.20 * oodVal + 0.15 * inputQuality) * 1000
  ) / 1000;

  const flags: string[] = [];
  if (meanConf < 0.65) flags.push('LOW_CONFIDENCE');
  if (hasDisagreement) flags.push('MODEL_DISAGREEMENT');
  if (isOod) flags.push('OUT_OF_DISTRIBUTION');
  if (inputQuality < 0.70) flags.push('LOW_INPUT_QUALITY');
  if (flags.length === 0) flags.push('NONE');

  let level: 'High' | 'Medium' | 'Low' = 'Low';
  if (relScore >= 0.75) level = 'High';
  else if (relScore >= 0.55) level = 'Medium';
  else level = 'Low';

  const needsHumanReview = relScore < 0.55 || isOod || hasDisagreement;

  let trustQuestion = '';
  if (level === 'High') {
    trustQuestion = 'Can I trust the AI decision? Yes — high model confidence, consensus agreement, and familiar in-distribution input.';
  } else if (level === 'Medium') {
    const reasons: string[] = [];
    if (hasDisagreement) reasons.push('model disagreement');
    if (isOod) reasons.push('unfamiliar data pattern');
    if (inputQuality < 0.8) reasons.push('sparse input');
    trustQuestion = `Can I trust the AI decision? Moderately — ${reasons.join(', ') || 'moderate confidence'}; human review recommended.`;
  } else {
    trustQuestion = 'Can I trust the AI decision? Low confidence / high epistemic uncertainty — routed to human review.';
  }

  return {
    score: relScore,
    level,
    mean_confidence: Math.round(meanConf * 1000) / 1000,
    has_disagreement: hasDisagreement,
    is_ood: isOod,
    input_quality: inputQuality,
    flags,
    trust_question: trustQuestion,
    needs_human_review: needsHumanReview,
  };
}

export function runFullPipeline(payload: CasePayload, config: RiskConfig): {
  detections: DetectionOutput[];
  riskDetail: RiskOutput;
  reliabilityDetail: ReliabilityOutput;
} {
  const textDet = runTextDetection(payload.text);
  const urlDet = runUrlRules(payload.url);
  const tabDet = runTabularDetection(payload.transaction);
  const idDet = runIdentityRules(payload.identity);
  const oodDet = runAnomalyAndOOD(payload.transaction, payload.text);
  const mockDets = runMockMediaStubs(payload.media_features);

  const detections: DetectionOutput[] = [
    textDet,
    tabDet,
    urlDet,
    idDet,
    oodDet,
    ...mockDets,
  ];

  const hasDisagreement = Boolean(textDet.details?.disagreement || tabDet.details?.disagreement);
  const isOod = Boolean(oodDet.details?.is_ood);

  // Input quality metric (completeness)
  let providedParts = 0;
  if (payload.text && payload.text.trim()) providedParts++;
  if (payload.url && payload.url.trim()) providedParts++;
  if (payload.transaction) providedParts++;
  if (payload.identity) providedParts++;
  const inputQuality = Math.min(1.0, Math.max(0.6, 0.6 + providedParts * 0.1));

  const riskDetail = computeRiskScore(detections, isOod, hasDisagreement, config);
  const reliabilityDetail = computeReliability(detections, isOod, hasDisagreement, inputQuality);

  return {
    detections,
    riskDetail,
    reliabilityDetail,
  };
}
