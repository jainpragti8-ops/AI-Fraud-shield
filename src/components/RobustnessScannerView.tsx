import React, { useState } from 'react';
import {
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Activity,
  Layers,
  Info,
} from 'lucide-react';
import { ScannerRunResponse } from '../services/robustnessScanner';

export const RobustnessScannerView: React.FC = () => {
  const [nSamples, setNSamples] = useState<number>(50);
  const [noiseLevel, setNoiseLevel] = useState<number>(0.10);
  const [target, setTarget] = useState<'all' | 'tabular' | 'text'>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ScannerRunResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunScan = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/scanner/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          n_samples: nSamples,
          noise_level: noiseLevel,
          target,
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to run defensive vulnerability scan');
      }
      const data: ScannerRunResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error running robustness scan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
              Defensive Robustness & Vulnerability Scanner
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulates synthetic feature boundary perturbations and Gaussian noise injections to measure decision flip rate and model boundary resilience.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono">
            <span>Admin Clearance: ENFORCED</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-950/80 border border-red-800 text-red-300 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: Controls & Scan Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Form (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            Adversarial Perturbation Parameters
          </h3>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Sample Size (Synthetic Population)</span>
              <span className="font-mono text-blue-400 font-bold">{nSamples} samples</span>
            </div>
            <input
              type="range"
              min={20}
              max={100}
              step={10}
              value={nSamples}
              onChange={(e) => setNSamples(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <span className="text-[11px] text-slate-500">Evaluates decision stability over N test vectors</span>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Perturbation Noise Level (&sigma;)</span>
              <span className="font-mono text-indigo-400 font-bold">{(noiseLevel * 100).toFixed(0)}% Noise</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.40}
              step={0.05}
              value={noiseLevel}
              onChange={(e) => setNoiseLevel(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <span className="text-[11px] text-slate-500">Std dev of injected Gaussian boundary noise</span>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Target Evaluation Surface</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Models (Ensemble Surface)</option>
              <option value="tabular">Tabular Fraud Models (M3 RF / M4 ANN)</option>
              <option value="text">Text Phishing Models (M1 LR / M2 NB)</option>
            </select>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-slate-300 block">Defensive Methodology:</span>
            <p>
              Injects controlled noise around critical decision boundaries to evaluate how readily adversarial noise can flip a fraud verdict to benign (evasion risk) or benign to fraud (friction risk).
            </p>
          </div>

          <button
            onClick={handleRunScan}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Injecting Perturbations & Scanning...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Execute Defensive Scan
              </>
            )}
          </button>
        </div>

        {/* Right: Results Dashboard (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {result ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Defensive Robustness Report
                  </span>
                  <span className="text-xs text-slate-500">Scan ID: {result.scan_id}</span>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  result.vulnerability_rating === 'RESILIENT'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : result.vulnerability_rating === 'MODERATE VULNERABILITY'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                }`}>
                  {result.vulnerability_rating}
                </span>
              </div>

              {/* Metrics Summary Row */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Robustness Index</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono mt-0.5 block">
                    {(result.robustness_score * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-500">Decision stability</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Flip Rate</span>
                  <span className={`text-2xl font-black font-mono mt-0.5 block ${
                    result.flip_rate > 0.15 ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {(result.flip_rate * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-500">Boundary flips</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Mean &Delta; Score</span>
                  <span className="text-2xl font-black text-white font-mono mt-0.5 block">
                    {(result.mean_score_delta * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-500">Avg variance</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {result.summary}
              </div>

              {/* Sample-Level Perturbation Inspection */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Sample-Level Perturbation Audit (First 10 Samples)
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-2">Sample</th>
                        <th className="p-2">Perturbed Feature</th>
                        <th className="p-2">Original &rarr; Perturbed</th>
                        <th className="p-2">Orig Pred</th>
                        <th className="p-2">New Pred</th>
                        <th className="p-2 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {result.samples.map((s) => (
                        <tr key={s.id} className={s.flipped ? 'bg-red-950/20' : ''}>
                          <td className="p-2 text-slate-400">#{s.id}</td>
                          <td className="p-2 text-slate-300 font-sans">{s.feature}</td>
                          <td className="p-2 text-slate-400">
                            {s.original_value} &rarr; <strong className="text-white">{s.perturbed_value}</strong>
                          </td>
                          <td className="p-2 text-slate-400">{s.original_pred}</td>
                          <td className="p-2 text-slate-200">{s.perturbed_pred}</td>
                          <td className="p-2 text-right">
                            {s.flipped ? (
                              <span className="px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 text-[10px] font-bold">
                                FLIPPED
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                                STABLE
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
              <ShieldAlert className="w-10 h-10 text-indigo-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Scanner Idle</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Configure perturbation noise levels on the left and click "Execute Defensive Scan" to evaluate adversarial stability.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
