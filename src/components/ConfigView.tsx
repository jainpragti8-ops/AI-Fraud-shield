import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  Database,
  Layers,
  Save,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { ModelCatalogItem, RiskConfig, Role } from '../types';

interface ConfigViewProps {
  currentRole: Role;
}

export const ConfigView: React.FC<ConfigViewProps> = ({ currentRole }) => {
  const [models, setModels] = useState<ModelCatalogItem[]>([]);
  const [config, setConfig] = useState<RiskConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [mRes, cRes] = await Promise.all([
          fetch('/api/v1/models'),
          fetch('/api/v1/config/risk'),
        ]);
        if (mRes.ok) setModels(await mRes.json());
        if (cRes.ok) setConfig(await cRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch('/api/v1/config/risk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSavedMsg('Risk weights and configuration parameters updated successfully.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-400" />
              Model Catalog & Risk Configuration
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect registered model artifacts and adjust dynamic re-normalization risk weights.
            </p>
          </div>

          {currentRole === 'admin' && (
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Parameters'}
            </button>
          )}
        </div>
      </div>

      {savedMsg && (
        <div className="bg-emerald-950 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Model Catalog Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-3">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            Registered Model Version Catalog
          </h3>
          <span className="text-xs text-slate-500 font-mono">9 Models Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Model Name</th>
                <th className="p-3">Version</th>
                <th className="p-3">Algorithm</th>
                <th className="p-3">Type Label</th>
                <th className="p-3">Artifact / Stub</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {models.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-3 font-bold text-white font-sans">{m.name}</td>
                  <td className="p-3 text-slate-400">{m.version}</td>
                  <td className="p-3 text-slate-300">{m.algorithm}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.impl_label === 'REAL_ML' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                      m.impl_label === 'RULE_BASED' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      'bg-purple-950 text-purple-400 border border-purple-800'
                    }`}>
                      {m.impl_label}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400 truncate max-w-xs">{m.artifact_path}</td>
                  <td className="p-3">
                    <span className="text-emerald-400 text-[10px] uppercase font-bold">
                      {m.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Engine Weights Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Dynamic Risk Engine Weights (Re-normalized on evaluated channels)
          </h3>
          <span className="text-xs text-slate-500 italic">Academic Standard IEEE 830</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {Object.entries(config.weights).map(([key, val]) => (
            <div key={key} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-semibold capitalize">{key.replace('_', ' ')}</span>
                <span className="font-mono text-blue-400 font-bold">{(val * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                disabled={currentRole !== 'admin'}
                value={val}
                onChange={(e) => {
                  const newW = { ...config.weights, [key]: Number(e.target.value) };
                  setConfig({ ...config, weights: newW });
                }}
                className="w-full accent-blue-500"
              />
            </div>
          ))}
        </div>

        {/* Uncertainty Bonuses */}
        <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-semibold">Out-of-Distribution (OOD) Penalty Bonus</span>
              <span className="font-mono text-purple-400 font-bold">+{config.uncertainty_bonuses.ood_bonus} pts</span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              disabled={currentRole !== 'admin'}
              value={config.uncertainty_bonuses.ood_bonus}
              onChange={(e) => {
                setConfig({
                  ...config,
                  uncertainty_bonuses: {
                    ...config.uncertainty_bonuses,
                    ood_bonus: Number(e.target.value),
                  },
                });
              }}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-semibold">Model Pair Disagreement Bonus</span>
              <span className="font-mono text-amber-400 font-bold">+{config.uncertainty_bonuses.disagreement_bonus} pts</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              disabled={currentRole !== 'admin'}
              value={config.uncertainty_bonuses.disagreement_bonus}
              onChange={(e) => {
                setConfig({
                  ...config,
                  uncertainty_bonuses: {
                    ...config.uncertainty_bonuses,
                    disagreement_bonus: Number(e.target.value),
                  },
                });
              }}
              className="w-full accent-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
