import React, { useState, useEffect } from 'react';
import {
  BellRing,
  CheckCircle2,
  AlertTriangle,
  History,
  Filter,
  RefreshCw,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Alert, AuditLog, Role } from '../types';

interface AlertsAndAuditViewProps {
  currentRole: Role;
  onAlertUpdated?: () => void;
}

export const AlertsAndAuditView: React.FC<AlertsAndAuditViewProps> = ({
  currentRole,
  onAlertUpdated,
}) => {
  const [tab, setTab] = useState<'alerts' | 'audit'>('alerts');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [alertStatusFilter, setAlertStatusFilter] = useState<string>('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertsRes, auditRes] = await Promise.all([
        fetch('/api/v1/alerts'),
        fetch('/api/v1/audit-logs'),
      ]);
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateAlertStatus = async (alertId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchData();
        if (onAlertUpdated) onAlertUpdated();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (alertStatusFilter && a.status !== alertStatusFilter) return false;
    return true;
  });

  const filteredLogs = auditLogs.filter((l) => {
    if (auditActionFilter && l.action !== auditActionFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BellRing className="w-5 h-5 text-red-400" />
              Security Alerts & System Audit Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live operational alerts and immutable forensic audit trail of all security and ML evaluation actions.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setTab('alerts')}
              className={`px-3 py-1.5 rounded font-semibold transition ${
                tab === 'alerts'
                  ? 'bg-red-600/20 text-red-300 border border-red-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              System Alerts ({alerts.filter(a => a.status === 'open').length} Open)
            </button>
            <button
              onClick={() => setTab('audit')}
              className={`px-3 py-1.5 rounded font-semibold transition ${
                tab === 'audit'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Audit Trail ({auditLogs.length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : tab === 'alerts' ? (
        /* Alerts View */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={alertStatusFilter}
                onChange={(e) => setAlertStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="open">Open Alerts</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <span className="text-xs text-slate-400">
              {filteredAlerts.length} total alerts
            </span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No alerts match the selected filter.
              </div>
            ) : (
              filteredAlerts.map((a) => (
                <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        a.severity === 'critical' ? 'bg-red-950 text-red-400 border border-red-800' :
                        a.severity === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-blue-950 text-blue-400'
                      }`}>
                        {a.severity}
                      </span>
                      <span className="font-semibold text-white text-xs">
                        {a.alert_type}
                      </span>
                      <span className="text-slate-500 text-[11px] font-mono">
                        #{a.id} • {new Date(a.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {a.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      a.status === 'open' ? 'text-red-400 bg-red-950/60' :
                      a.status === 'acknowledged' ? 'text-amber-400 bg-amber-950/60' :
                      'text-emerald-400 bg-emerald-950/60'
                    }`}>
                      {a.status}
                    </span>

                    {currentRole !== 'auditor' && a.status !== 'resolved' && (
                      <div className="flex items-center gap-1.5">
                        {a.status === 'open' && (
                          <button
                            onClick={() => handleUpdateAlertStatus(a.id, 'acknowledged')}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
                          >
                            Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateAlertStatus(a.id, 'resolved')}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition"
                        >
                          Resolve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Audit Trail View */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
              >
                <option value="">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="CASE_ANALYZE">CASE_ANALYZE</option>
                <option value="HUMAN_REVIEW">HUMAN_REVIEW</option>
                <option value="ALERT_CHANGE">ALERT_CHANGE</option>
                <option value="SCANNER_RUN">SCANNER_RUN</option>
                <option value="DRIFT_SIMULATION">DRIFT_SIMULATION</option>
                <option value="CONFIG_CHANGE">CONFIG_CHANGE</option>
              </select>
            </div>
            <span className="text-xs text-slate-400">
              {filteredLogs.length} immutable events recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Resource</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Outcome</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition font-mono text-[11px]">
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString()} {new Date(log.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-bold text-blue-400">
                      {log.action}
                    </td>
                    <td className="p-3 text-slate-300">
                      {log.resource} {log.resource_id ? `#${log.resource_id}` : ''}
                    </td>
                    <td className="p-3 text-white">
                      {log.username}
                    </td>
                    <td className="p-3">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        log.outcome === 'SUCCESS' ? 'text-emerald-400 bg-emerald-950/60' : 'text-red-400 bg-red-950/60'
                      }`}>
                        {log.outcome}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 font-sans max-w-md truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
