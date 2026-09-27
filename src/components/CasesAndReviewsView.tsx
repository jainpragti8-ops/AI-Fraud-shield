import React, { useState, useEffect } from 'react';
import {
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  FileText,
  Clock,
  ShieldAlert,
  HelpCircle,
  X,
} from 'lucide-react';
import { Case, Role } from '../types';
import { handleClientApiRequest } from '../services/clientApi';

interface CasesAndReviewsViewProps {
  currentRole: Role;
  onReviewSubmitted?: () => void;
}

export const CasesAndReviewsView: React.FC<CasesAndReviewsViewProps> = ({
  currentRole,
  onReviewSubmitted,
}) => {
  const [subTab, setSubTab] = useState<'queue' | 'all'>('queue');
  const [cases, setCases] = useState<Case[]>(() => handleClientApiRequest('/api/v1/cases') || []);
  const [queueItems, setQueueItems] = useState<any[]>(() => handleClientApiRequest('/api/v1/reviews/queue') || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  // Review form modal
  const [reviewingCaseId, setReviewingCaseId] = useState<number | null>(null);
  const [reviewDecision, setReviewDecision] = useState<string>('confirmed_fraud');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  // Filter
  const [riskFilter, setRiskFilter] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [casesRes, queueRes] = await Promise.all([
        fetch('/api/v1/cases'),
        fetch('/api/v1/reviews/queue'),
      ]);
      if (casesRes.ok) {
        const cData = await casesRes.json();
        setCases(cData);
      } else {
        const fbCases = handleClientApiRequest('/api/v1/cases');
        if (fbCases) setCases(fbCases);
      }
      if (queueRes.ok) {
        const qData = await queueRes.json();
        setQueueItems(qData);
      } else {
        const fbQueue = handleClientApiRequest('/api/v1/reviews/queue');
        if (fbQueue) setQueueItems(fbQueue);
      }
    } catch (err) {
      console.warn('Failed to load cases data via network, falling back', err);
      const fbCases = handleClientApiRequest('/api/v1/cases');
      if (fbCases) setCases(fbCases);
      const fbQueue = handleClientApiRequest('/api/v1/reviews/queue');
      if (fbQueue) setQueueItems(fbQueue);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitReview = async () => {
    if (!reviewingCaseId) return;
    setSubmittingReview(true);
    setReviewSuccess(null);

    try {
      const res = await fetch(`/api/v1/reviews/${reviewingCaseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: reviewDecision,
          notes: reviewNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit review');
      }

      setReviewSuccess(`Case #${reviewingCaseId} reviewed successfully with ground truth label.`);
      setReviewingCaseId(null);
      setReviewNotes('');
      await fetchData();
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err: any) {
      alert(err.message || 'Error submitting review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    if (riskFilter && c.risk_level !== riskFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header with Sub-tab switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Inbox className="w-5 h-5 text-amber-400" />
              Cases & Human Review Queue
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Human-in-the-loop investigation: ground truth labels directly calibrate rolling model health telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setSubTab('queue')}
              className={`px-3 py-1.5 rounded font-semibold transition ${
                subTab === 'queue'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending Reviews ({queueItems.length})
            </button>
            <button
              onClick={() => setSubTab('all')}
              className={`px-3 py-1.5 rounded font-semibold transition ${
                subTab === 'all'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Ingested Cases ({cases.length})
            </button>
          </div>
        </div>
      </div>

      {reviewSuccess && (
        <div className="bg-emerald-950 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{reviewSuccess}</span>
          </div>
          <button onClick={() => setReviewSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : subTab === 'queue' ? (
        /* Review Queue Sub-tab */
        <div className="space-y-4">
          {queueItems.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white">Queue Clear</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No cases currently require human triage. Cases with High/Critical risk, OOD inputs, or model disagreement appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {queueItems.map((item) => (
                <div
                  key={item.case_id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">
                          Case #{item.case_id}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.risk_level === 'Critical' ? 'bg-red-950 text-red-400 border border-red-800' :
                          item.risk_level === 'High' ? 'bg-orange-950 text-orange-400 border border-orange-800' :
                          'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {item.risk_level} Risk ({item.risk_score})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Ingested {new Date(item.created_at).toLocaleTimeString()} • {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <span className="px-2 py-0.5 bg-slate-950 rounded text-[10px] text-slate-400 border border-slate-800">
                      Trigger: {item.trigger_reason}
                    </span>
                  </div>

                  {item.payload?.text && (
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 italic line-clamp-2">
                      "{item.payload.text}"
                    </div>
                  )}

                  {item.payload?.transaction && (
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg">
                      <span>Amount: <strong className="text-white">${item.payload.transaction.amount}</strong></span>
                      <span>Ratio: <strong className="text-white">{item.payload.transaction.amount_to_avg_ratio}x</strong></span>
                      <span>Logins: <strong className="text-white">{item.payload.transaction.failed_logins_24h}</strong></span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        const c = cases.find(x => x.id === item.case_id);
                        if (c) setSelectedCase(c);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect Evidence
                    </button>

                    {currentRole !== 'auditor' ? (
                      <button
                        onClick={() => {
                          setReviewingCaseId(item.case_id);
                          setReviewDecision('confirmed_fraud');
                          setReviewNotes('');
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow transition"
                      >
                        Submit Ground Truth
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Auditor (View Only)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* All Ingested Cases Sub-tab */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
              >
                <option value="">All Risk Levels</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredCases.length} of {cases.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Case ID</th>
                  <th className="p-3">Risk Score</th>
                  <th className="p-3">Reliability</th>
                  <th className="p-3">Input Summary</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Human Review</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-white">#{c.id}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          c.risk_level === 'Critical' ? 'bg-red-500' :
                          c.risk_level === 'High' ? 'bg-orange-500' :
                          c.risk_level === 'Medium' ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}></span>
                        <span className="font-semibold text-slate-200">{c.risk_score}</span>
                        <span className="text-[10px] text-slate-400">({c.risk_level})</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.reliability_level === 'High' ? 'bg-emerald-950 text-emerald-400' :
                        c.reliability_level === 'Medium' ? 'bg-amber-950 text-amber-400' :
                        'bg-red-950 text-red-400'
                      }`}>
                        {c.reliability_level} ({c.reliability_score || 0.85})
                      </span>
                    </td>
                    <td className="p-3 max-w-xs truncate text-slate-300">
                      {c.payload?.text || c.payload?.url || (c.payload?.transaction ? `Txn $${c.payload.transaction.amount}` : 'Multi-channel')}
                    </td>
                    <td className="p-3">
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {c.review ? (
                        <span className="px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded text-[10px] font-semibold">
                          {c.review.decision}
                        </span>
                      ) : c.needs_human_review ? (
                        <span className="text-amber-400 text-[11px] font-medium">Pending Review</span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Auto-closed</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedCase(c)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Submission Modal */}
      {reviewingCaseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Inbox className="w-5 h-5 text-amber-400" />
                Human Review: Case #{reviewingCaseId}
              </h3>
              <button onClick={() => setReviewingCaseId(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select the definitive ground truth verdict. This label will be added to the rolling evaluation window to recalculate precision, recall, and false alert rates.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Ground Truth Decision</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'confirmed_fraud', label: 'Confirmed Fraud (TP)', desc: 'True positive fraudulent attack' },
                  { id: 'false_positive', label: 'False Positive (FP)', desc: 'Genuine user incorrectly blocked' },
                  { id: 'false_negative', label: 'False Negative (FN)', desc: 'Fraud missed by detector' },
                  { id: 'benign', label: 'Confirmed Benign (TN)', desc: 'Normal user activity' },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => setReviewDecision(opt.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition ${
                      reviewDecision === opt.id
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold block text-xs">{opt.label}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{opt.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Analyst Justification Notes</label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Reasoning, customer interaction log, external verification..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setReviewingCaseId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
              >
                {submittingReview ? 'Calibrating Health...' : 'Confirm Ground Truth'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Detail Inspection Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Case #{selectedCase.id} Full Forensic Evidence
                </h3>
                <span className="text-xs text-slate-400">
                  Hash: {selectedCase.content_hash} • Ingested: {new Date(selectedCase.created_at).toLocaleString()}
                </span>
              </div>
              <button onClick={() => setSelectedCase(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score & Reliability Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block">Risk Classification</span>
                <span className="text-xl font-extrabold text-white">
                  {selectedCase.risk_score} / 100 ({selectedCase.risk_level})
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  {selectedCase.risk_detail?.explanation}
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block">Decision Reliability</span>
                <span className="text-xl font-extrabold text-blue-400">
                  {selectedCase.reliability_level} ({(selectedCase.reliability_score || 0.85).toFixed(2)})
                </span>
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  "{selectedCase.reliability_detail?.trust_question}"
                </p>
              </div>
            </div>

            {/* Ingested Payload */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Raw Ingested Elements</h4>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
                {selectedCase.payload?.text && (
                  <div>
                    <span className="text-slate-500 font-semibold block">Message:</span>
                    <p className="text-slate-200">{selectedCase.payload.text}</p>
                  </div>
                )}
                {selectedCase.payload?.url && (
                  <div>
                    <span className="text-slate-500 font-semibold block">URL:</span>
                    <p className="text-blue-400 font-mono">{selectedCase.payload.url}</p>
                  </div>
                )}
                {selectedCase.payload?.transaction && (
                  <div>
                    <span className="text-slate-500 font-semibold block">Transaction:</span>
                    <pre className="text-slate-300 font-mono text-[11px]">
                      {JSON.stringify(selectedCase.payload.transaction, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Individual Detector Results */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detectors Output Table</h4>
              <div className="space-y-1.5 text-xs">
                {selectedCase.detections?.map((d) => (
                  <div key={d.module} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 uppercase">{d.module}</span>
                      <span className="ml-2 text-[10px] px-1 bg-slate-800 rounded text-slate-400">{d.label}</span>
                    </div>
                    <span className="font-mono text-slate-300">
                      {d.prediction} ({(d.probability * 100).toFixed(0)}% prob)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
