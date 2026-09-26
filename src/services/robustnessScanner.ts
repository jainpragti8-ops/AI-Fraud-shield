export interface ScannerRunRequest {
  n_samples?: number;
  noise_level?: number;
  target?: 'all' | 'tabular' | 'text';
}

export interface PerturbationSample {
  id: number;
  feature: string;
  original_value: number;
  perturbed_value: number;
  original_pred: string;
  perturbed_pred: string;
  flipped: boolean;
  prob_delta: number;
}

export interface ScannerRunResponse {
  scan_id: string;
  target: string;
  n_samples: number;
  noise_level: number;
  flip_rate: number;
  mean_score_delta: number;
  robustness_score: number;
  vulnerability_rating: 'RESILIENT' | 'MODERATE VULNERABILITY' | 'HIGH ADVERSARIAL RISK';
  summary: string;
  samples: PerturbationSample[];
  scanned_at: string;
}

export function runDefensiveRobustnessScan(
  nSamples: number = 50,
  noiseLevel: number = 0.10,
  target: 'all' | 'tabular' | 'text' = 'all'
): ScannerRunResponse {
  const samples: PerturbationSample[] = [];
  let flips = 0;
  let totalDelta = 0;

  const features = ['amount_to_avg_ratio', 'failed_logins_24h', 'geo_distance_km', 'hour_of_day', 'account_age_days'];

  for (let i = 0; i < nSamples; i++) {
    const feat = features[i % features.length];
    // Baseline value near threshold boundary
    const isBorderline = i % 4 === 0;
    const baseVal = isBorderline ? 2.1 : 1.2 + (i * 0.15);
    const noise = (Math.random() * 2 - 1) * noiseLevel * baseVal;
    const perturbedVal = Math.max(0, baseVal + noise);

    const origPred = baseVal > 2.0 ? 'fraud' : 'non_fraud';
    const perturbedPred = perturbedVal > 2.0 ? 'fraud' : 'non_fraud';
    const flipped = origPred !== perturbedPred;

    const probDelta = Math.abs(Math.round(noise * 0.35 * 1000) / 1000);
    totalDelta += probDelta;

    if (flipped) flips++;

    if (i < 10) {
      samples.push({
        id: i + 1,
        feature: feat,
        original_value: Math.round(baseVal * 100) / 100,
        perturbed_value: Math.round(perturbedVal * 100) / 100,
        original_pred: origPred,
        perturbed_pred: perturbedPred,
        flipped,
        prob_delta: probDelta,
      });
    }
  }

  const flipRate = Math.round((flips / nSamples) * 1000) / 1000;
  const meanScoreDelta = Math.round((totalDelta / nSamples) * 1000) / 1000;
  const robustnessScore = Math.round((1.0 - flipRate) * 1000) / 1000;

  let rating: 'RESILIENT' | 'MODERATE VULNERABILITY' | 'HIGH ADVERSARIAL RISK' = 'RESILIENT';
  if (flipRate > 0.20) rating = 'HIGH ADVERSARIAL RISK';
  else if (flipRate > 0.08) rating = 'MODERATE VULNERABILITY';

  const summary = `Evaluated ${nSamples} synthetic samples with σ=${noiseLevel} noise injection. ` +
    `${flips} decisions flipped (${(flipRate * 100).toFixed(1)}% flip rate). Robustness index: ${(robustnessScore * 100).toFixed(1)}%. Rating: ${rating}.`;

  return {
    scan_id: 'scan_' + Date.now().toString(36),
    target,
    n_samples: nSamples,
    noise_level: noiseLevel,
    flip_rate: flipRate,
    mean_score_delta: meanScoreDelta,
    robustness_score: robustnessScore,
    vulnerability_rating: rating,
    summary,
    samples,
    scanned_at: new Date().toISOString(),
  };
}
