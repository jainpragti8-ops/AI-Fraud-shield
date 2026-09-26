import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Zap,
  Info,
} from 'lucide-react';
import { ModelHealthSnapshot } from '../types';

export const ModelHealthView: React.FC = () => {
  const [snapshot, setSnapshot] = useState<ModelHealthSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/model-health');
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
      }
    } catch (e) {
      console.error('Failed to fetch health telemetry', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleEvaluate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/model-health/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ window_size: 50 }),
      });
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
        setBannerMsg('Evaluation window recomputed over latest verified samples.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDriftSimulation = async (severity: 'moderate' | 'severe') => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/model-health/drift-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ severity }),
      });
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
        setBannerMsg(
          severity === 'severe'
            ? 'Severe drift injected! PSI > 0.25 triggered failure threshold and alert.'
            : 'Moderate drift injected (PSI: 0.16). Warning rule fired.'
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !snapshot) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { metrics, operational, drift, rules_triggered } = snapshot;

  return (
    <div className="space-y-6">
      {/* Status Header Banner */}
      <div className={`p-6 rounded-2xl border transition-all ${
        snapshot.status.includes('FAILURE')
          ? 'bg-red-950/40 border-red-800 text-red-200'
          : snapshot.status.includes('ALERT')
          ? 'bg-amber-950/40 border-amber-800 text-amber-200'
          : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              snapshot.status.includes('FAILURE') ? 'bg-red-500/20 text-red-400' :
              snapshot.status.includes('ALERT') ? 'bg-amber-500/20 text-amber-400' :
              'bg-emerald-500/20 text-emerald-400'
            }`}>
              {snapshot.status.includes('FAILURE') ? <ShieldAlert className="w-8 h-8" /> :
               snapshot.status.includes('ALERT') ? <AlertTriangle className="w-8 h-8" /> :
               <ShieldCheck className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider opacity-75">
                  AI Failure Detection Engine Status
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900/60 font-mono">
                  {snapshot.model_version}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5 text-white">
                {snapshot.status}
              </h2>
              <p className="text-xs opacity-80 mt-1">
                Evaluated over {snapshot.labelled_samples} verified ground-truth cases • Window Size: {snapshot.window_size}
              </p>
            </div>
          </div>

          {/* Quick Simulation Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleEvaluate}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
              Recalculate
            </button>
            <button
              onClick={() => handleDriftSimulation('moderate')}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-amber-900/80 hover:bg-amber-800 text-amber-200 text-xs font-semibold rounded-lg border border-amber-700 transition disabled:opacity-50"
            >
              Inject Moderate Drift
            </button>
            <button
              onClick={() => handleDriftSimulation('severe')}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-red-200 text-xs font-semibold rounded-lg border border-red-700 flex items-center gap-1 transition disabled:opacity-50"
            >
              <Flame className="w-3.5 h-3.5" />
              Simulate Severe Failure
            </button>
          </div>
        </div>
      </div>

      {bannerMsg && (
        <div className="bg-blue-950/80 border border-blue-800 text-blue-300 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between">
          <span>{bannerMsg}</span>
          <button onClick={() => setBannerMsg(null)} className="text-blue-400 hover:text-white font-bold">×</button>
        </div>
      )}

      {/* Grid: Confusion Matrix & Supervised Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Confusion Matrix (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Confusion Matrix (2x2)
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">N={snapshot.labelled_samples}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            {/* TP */}
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                True Positive (TP)
              </span>
              <span className="text-2xl font-black text-emerald-300 font-mono mt-1 block">
                {metrics.confusion_matrix.tp}
              </span>
              <span className="text-[10px] text-slate-400">Fraud correctly flagged</span>
            </div>

            {/* FP */}
            <div className={`p-4 rounded-xl border ${
              metrics.confusion_matrix.fp > 3 ? 'bg-red-950/40 border-red-800/80 text-red-300' : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}>
              <span className="text-[10px] uppercase font-bold text-amber-400 block">
                False Positive (FP)
              </span>
              <span className="text-2xl font-black text-white font-mono mt-1 block">
                {metrics.confusion_matrix.fp}
              </span>
              <span className="text-[10px] text-slate-400">Benign blocked</span>
            </div>

            {/* FN */}
            <div className={`p-4 rounded-xl border ${
              metrics.confusion_matrix.fn > 2 ? 'bg-red-950/60 border-red-800 text-red-300' : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}>
              <span className="text-[10px] uppercase font-bold text-red-400 block">
                False Negative (FN)
              </span>
              <span className="text-2xl font-black text-white font-mono mt-1 block">
                {metrics.confusion_matrix.fn}
              </span>
              <span className="text-[10px] text-slate-400">Missed fraud attack</span>
            </div>

            {/* TN */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-blue-400 block">
                True Negative (TN)
              </span>
              <span className="text-2xl font-black text-blue-300 font-mono mt-1 block">
                {metrics.confusion_matrix.tn}
              </span>
              <span className="text-[10px] text-slate-400">Benign allowed</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
            <div className="flex justify-between">
              <span>False Positive Rate (FPR):</span>
              <strong className={metrics.fpr > 0.15 ? 'text-amber-400 font-mono' : 'text-slate-200 font-mono'}>
                {(metrics.fpr * 100).toFixed(1)}% (limit &lt;15%)
              </strong>
            </div>
            <div className="flex justify-between">
              <span>False Negative Rate (FNR):</span>
              <strong className={metrics.fnr > 0.20 ? 'text-red-400 font-mono' : 'text-slate-200 font-mono'}>
                {(metrics.fnr * 100).toFixed(1)}% (limit &lt;20%)
              </strong>
            </div>
          </div>
        </div>

        {/* Supervised Performance Telemetry (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Rolling Window Classification Metrics
            </h3>
            <span className="text-xs text-slate-400">Continuous Human-Verified Samples</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Accuracy', val: metrics.accuracy, min: 0.85, isGood: metrics.accuracy >= 0.85 },
              { label: 'Precision', val: metrics.precision, min: 0.80, isGood: metrics.precision >= 0.80 },
              { label: 'Recall', val: metrics.recall, min: 0.75, isGood: metrics.recall >= 0.75 },
              { label: 'F1 Score', val: metrics.f1, min: 0.70, isGood: metrics.f1 >= 0.70 },
            ].map((m) => (
              <div key={m.label} className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">{m.label}</span>
                <span className={`text-2xl font-black font-mono block mt-1 ${
                  m.isGood ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {(m.val * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500">
                  Target: &ge;{(m.min * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          {/* Operational & Confidence Telemetry */}
          <div className="pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Model Ensemble & Epistemic Uncertainty Telemetry
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Mean Confidence</span>
                <span className="text-lg font-bold font-mono text-white mt-0.5 block">
                  {(operational.mean_confidence * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500">Threshold: &gt;70%</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Pair Disagreement</span>
                <span className={`text-lg font-bold font-mono mt-0.5 block ${
                  operational.disagreement_rate > 0.20 ? 'text-amber-400' : 'text-white'
                }`}>
                  {(operational.disagreement_rate * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500">Threshold: &lt;20%</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">OOD Traffic Rate</span>
                <span className={`text-lg font-bold font-mono mt-0.5 block ${
                  operational.ood_rate > 0.10 ? 'text-purple-400' : 'text-white'
                }`}>
                  {(operational.ood_rate * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500">Threshold: &lt;10%</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Mean Latency</span>
                <span className="text-lg font-bold font-mono text-white mt-0.5 block">
                  {operational.mean_latency_ms} ms
                </span>
                <span className="text-[10px] text-slate-500">Threshold: &lt;1000ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Distribution Drift (PSI & KS Test) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Continuous Feature Distribution Drift (PSI & KS Tests)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Monitors input shifts vs baseline training distributions. PSI &gt; 0.10 = moderate drift; PSI &gt; 0.25 = significant shift requiring retraining.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Peak PSI</span>
            <span className={`text-base font-black font-mono ${
              drift.psi_max > 0.25 ? 'text-red-400' :
              drift.psi_max >= 0.10 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {drift.psi_max.toFixed(3)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {drift.drifted_features.map((df) => (
            <div key={df.feature} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">{df.feature}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  df.drift_status === 'significant' ? 'bg-red-950 text-red-400 border border-red-800' :
                  df.drift_status === 'moderate' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                  'bg-emerald-950 text-emerald-400'
                }`}>
                  {df.drift_status}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                <span>PSI: <strong className="text-white font-mono">{df.psi.toFixed(3)}</strong></span>
                <span>KS p-val: <strong className="text-white font-mono">{df.ks_pvalue.toFixed(3)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Triggered Health Rules & Actionable Recommendations */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>Active Failure Detection Rules & Recommendations</span>
          <span className="text-[11px] text-slate-500 font-mono">
            {rules_triggered.length} rules firing
          </span>
        </h3>

        {rules_triggered.length === 0 ? (
          <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl flex items-center gap-3 text-xs text-emerald-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>All 17 model reliability and failure detection rules passing nominal tolerances.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {rules_triggered.map((rule) => (
              <div
                key={rule.id}
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  rule.level === 'critical'
                    ? 'bg-red-950/40 border-red-800 text-red-200'
                    : 'bg-amber-950/40 border-amber-800 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      rule.level === 'critical' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                    }`}>
                      {rule.level}
                    </span>
                    <span>{rule.id}: {rule.message}</span>
                  </div>
                  <span className="font-mono">
                    Actual: {rule.actual_value} (Limit {rule.operator} {rule.threshold})
                  </span>
                </div>
                <div className="text-[11px] opacity-90 pl-1 pt-0.5">
                  <strong>Engineering Recommendation:</strong> {rule.recommendation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
