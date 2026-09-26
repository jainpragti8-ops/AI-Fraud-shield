import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Inbox,
  Activity,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface DashboardStats {
  total_cases: number;
  level_counts: {
    Low: number;
    Medium: number;
    High: number;
    Critical: number;
  };
  open_alerts_count: number;
  pending_reviews_count: number;
  fp_count: number;
  fn_count: number;
  confirmed_fraud: number;
  latest_risk_score: number;
  latest_risk_level: string;
  health_status: string;
  timeline: Array<{
    case_id: number;
    timestamp: string;
    score: number;
    level: string;
  }>;
}

interface DashboardViewProps {
  stats: DashboardStats | null;
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ stats, onNavigate }) => {
  if (!stats) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const criticalAndHigh = (stats.level_counts.Critical || 0) + (stats.level_counts.High || 0);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              AI FraudShield Operational Command
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Continuous multi-modal fraud detection coupled with dual-layer Model Security & Reliability monitoring.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('scanner')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition"
            >
              <Zap className="w-4 h-4" />
              New Threat Scan
            </button>
            <button
              onClick={() => onNavigate('health')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              Inspect Health
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingested Cases */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Ingested Cases
            </span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{stats.total_cases}</span>
            <span className="text-xs text-slate-400">across 6 channels</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-400">
            <span>Latest case score:</span>
            <span className="ml-1 font-bold text-white">{stats.latest_risk_score}</span>
            <span className={`ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${
              stats.latest_risk_level === 'Critical' ? 'bg-red-900/60 text-red-300' :
              stats.latest_risk_level === 'High' ? 'bg-orange-900/60 text-orange-300' :
              stats.latest_risk_level === 'Medium' ? 'bg-amber-900/60 text-amber-300' :
              'bg-emerald-900/60 text-emerald-300'
            }`}>
              {stats.latest_risk_level}
            </span>
          </div>
        </div>

        {/* High / Critical Threats */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              High / Critical Threats
            </span>
            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-red-400">{criticalAndHigh}</span>
            <span className="text-xs text-slate-400">
              ({stats.total_cases > 0 ? Math.round((criticalAndHigh / stats.total_cases) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-400">
            <span>Critical: <strong className="text-red-400">{stats.level_counts.Critical || 0}</strong></span>
            <span className="mx-2">•</span>
            <span>High: <strong className="text-orange-400">{stats.level_counts.High || 0}</strong></span>
          </div>
        </div>

        {/* Pending Human Reviews */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Human Review Queue
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400">
              {stats.pending_reviews_count}
            </span>
            <span className="text-xs text-slate-400">awaiting analyst</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Resolved: <strong className="text-slate-200">{stats.confirmed_fraud + stats.fp_count}</strong></span>
            <button
              onClick={() => onNavigate('cases')}
              className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-0.5"
            >
              Open Queue <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Model Health Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Model Health State
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-base font-bold text-white truncate">
              {stats.health_status}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Open Alerts: <strong className={stats.open_alerts_count > 0 ? 'text-red-400' : 'text-slate-300'}>{stats.open_alerts_count}</strong></span>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-0.5"
            >
              View Alerts <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Risk Distribution + Risk Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Risk Level Distribution
            </h2>
            <span className="text-xs text-slate-400">{stats.total_cases} Total Cases</span>
          </div>

          <div className="space-y-4">
            {[
              { level: 'Critical', count: stats.level_counts.Critical || 0, color: 'bg-red-500', text: 'text-red-400', range: '81-100' },
              { level: 'High', count: stats.level_counts.High || 0, color: 'bg-orange-500', text: 'text-orange-400', range: '61-80' },
              { level: 'Medium', count: stats.level_counts.Medium || 0, color: 'bg-amber-500', text: 'text-amber-400', range: '31-60' },
              { level: 'Low', count: stats.level_counts.Low || 0, color: 'bg-emerald-500', text: 'text-emerald-400', range: '0-30' },
            ].map((item) => {
              const pct = stats.total_cases > 0 ? Math.round((item.count / stats.total_cases) * 100) : 0;
              return (
                <div key={item.level} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                      <span className="text-slate-200">{item.level}</span>
                      <span className="text-slate-500 text-[11px]">({item.range})</span>
                    </span>
                    <span className="text-slate-400 font-mono">
                      {item.count} cases ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${item.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>FP / FN Review Feedback:</span>
            <div className="flex gap-4">
              <span>FP: <strong className="text-slate-200">{stats.fp_count}</strong></span>
              <span>FN: <strong className="text-slate-200">{stats.fn_count}</strong></span>
              <span>Confirmed: <strong className="text-emerald-400">{stats.confirmed_fraud}</strong></span>
            </div>
          </div>
        </div>

        {/* Risk Score Timeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Risk Trend (Recent Cases)
            </h2>
            <span className="text-xs text-slate-400">0–100 Threshold Banding</span>
          </div>

          {stats.timeline.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-500">
              No recent timeline points recorded
            </div>
          ) : (
            <div className="space-y-3">
              {/* Visual mini-bars of recent cases */}
              <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 border-b border-slate-800 px-1 overflow-x-auto">
                {stats.timeline.slice(-16).map((pt) => {
                  const barHeight = Math.max(8, Math.min(100, pt.score));
                  const barColor =
                    pt.score >= 81 ? 'bg-red-500 hover:bg-red-400' :
                    pt.score >= 61 ? 'bg-orange-500 hover:bg-orange-400' :
                    pt.score >= 31 ? 'bg-amber-500 hover:bg-amber-400' :
                    'bg-emerald-500 hover:bg-emerald-400';

                  return (
                    <div
                      key={pt.case_id}
                      className="flex-1 min-w-[20px] flex flex-col items-center gap-1 group relative cursor-pointer"
                      title={`Case #${pt.case_id}: Score ${pt.score} (${pt.level})`}
                    >
                      <div
                        className={`w-full rounded-t transition-all ${barColor}`}
                        style={{ height: `${barHeight}%` }}
                      ></div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        #{pt.case_id}
                      </span>

                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-slate-950 border border-slate-700 text-white text-[11px] p-2 rounded shadow-lg z-20 whitespace-nowrap">
                        <span className="font-bold">Case #{pt.case_id}</span>
                        <span>Score: {pt.score}/100</span>
                        <span className="text-slate-400">{pt.level}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-red-500"></span> Critical (&gt;80)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-orange-500"></span> High (61-80)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-amber-500"></span> Medium (31-60)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-emerald-500"></span> Low (&le;30)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dual Pillars Architecture Callout */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Architecture Status: Dual-Pillar Framework
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <span className="font-bold text-blue-400 block mb-1">
              Pillar 1: Multi-Modal Threat Detection
            </span>
            <p className="text-slate-400">
              Active detection across Text Phishing (M1/M2), Tabular Transaction (M3/M4), Lexical URLs, Identity Consistency, and Anomaly/OOD checks with dynamic weight re-normalization.
            </p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <span className="font-bold text-emerald-400 block mb-1">
              Pillar 2: Model Security & Failure Telemetry ("AI Monitoring AI")
            </span>
            <p className="text-slate-400">
              Continuous Population Stability Index (PSI), Kolmogorov-Smirnov drift testing, confusion matrix metrics over human review ground truths, and defensive perturbation testing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
