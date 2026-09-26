import React, { useState } from 'react';
import {
  Zap,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Case, CasePayload } from '../types';

interface ThreatScannerViewProps {
  onScanComplete?: (newCase: Case) => void;
  onNavigateToCases?: () => void;
}

export const ThreatScannerView: React.FC<ThreatScannerViewProps> = ({
  onScanComplete,
  onNavigateToCases,
}) => {
  // Form fields
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [amount, setAmount] = useState<number>(45.0);
  const [avgAmount30d, setAvgAmount30d] = useState<number>(40.0);
  const [hourOfDay, setHourOfDay] = useState<number>(14);
  const [txnCount24h, setTxnCount24h] = useState<number>(3);
  const [newDevice, setNewDevice] = useState<number>(0);
  const [geoDistanceKm, setGeoDistanceKm] = useState<number>(8.5);
  const [accountAgeDays, setAccountAgeDays] = useState<number>(650);
  const [failedLogins24h, setFailedLogins24h] = useState<number>(0);

  // Identity
  const [nameMatchesId, setNameMatchesId] = useState<boolean>(true);
  const [deviceKnown, setDeviceKnown] = useState<boolean>(true);
  const [locationPlausible, setLocationPlausible] = useState<boolean>(true);
  const [contactInfoMatch, setContactInfoMatch] = useState<boolean>(true);

  // Media
  const [voiceFlatness, setVoiceFlatness] = useState<number>(0.08);
  const [faceJitter, setFaceJitter] = useState<number>(0.05);
  const [docArtifacts, setDocArtifacts] = useState<number>(0.12);

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<Case | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Canary presets
  const applyPreset = (type: string) => {
    setErrorMsg(null);
    if (type === 'phishing_wire') {
      setText('SECURITY ALERT: Urgent wire transfer pending. Confirm OTP immediately at http://bank-wire-portal.online/auth or your account will be suspended.');
      setUrl('http://bank-wire-portal.online/auth?action=verify');
      setAmount(1850.0);
      setAvgAmount30d(75.0);
      setHourOfDay(2);
      setTxnCount24h(14);
      setNewDevice(1);
      setGeoDistanceKm(820.0);
      setAccountAgeDays(45);
      setFailedLogins24h(3);
      setNameMatchesId(true);
      setDeviceKnown(false);
      setLocationPlausible(false);
      setContactInfoMatch(false);
      setVoiceFlatness(0.65);
      setFaceJitter(0.72);
      setDocArtifacts(0.60);
    } else if (type === 'geo_takeover') {
      setText('Login verification code: 849204. Do not share this code with anyone.');
      setUrl('https://verified-bank.com/dashboard');
      setAmount(940.0);
      setAvgAmount30d(120.0);
      setHourOfDay(4);
      setTxnCount24h(8);
      setNewDevice(1);
      setGeoDistanceKm(1240.0);
      setAccountAgeDays(14);
      setFailedLogins24h(4);
      setNameMatchesId(false);
      setDeviceKnown(false);
      setLocationPlausible(false);
      setContactInfoMatch(true);
      setVoiceFlatness(0.12);
      setFaceJitter(0.09);
      setDocArtifacts(0.15);
    } else if (type === 'benign_grocery') {
      setText('Your grocery order #84920 has been delivered. Thank you for shopping with FreshMart.');
      setUrl('https://freshmart.com/order/84920');
      setAmount(38.5);
      setAvgAmount30d(42.0);
      setHourOfDay(13);
      setTxnCount24h(2);
      setNewDevice(0);
      setGeoDistanceKm(3.2);
      setAccountAgeDays(1150);
      setFailedLogins24h(0);
      setNameMatchesId(true);
      setDeviceKnown(true);
      setLocationPlausible(true);
      setContactInfoMatch(true);
      setVoiceFlatness(0.05);
      setFaceJitter(0.04);
      setDocArtifacts(0.08);
    } else if (type === 'ood_extreme') {
      setText('TEST PAYLOAD XXXXXX OOD MATRIX 99999999999999999999999999999999999999999999999999999');
      setUrl('http://192.168.1.1@malformed.test.host.unknown-tld.rest');
      setAmount(99999.0);
      setAvgAmount30d(10.0);
      setHourOfDay(1);
      setTxnCount24h(48);
      setNewDevice(1);
      setGeoDistanceKm(12500.0);
      setAccountAgeDays(1);
      setFailedLogins24h(10);
      setNameMatchesId(false);
      setDeviceKnown(false);
      setLocationPlausible(false);
      setContactInfoMatch(false);
      setVoiceFlatness(0.95);
      setFaceJitter(0.92);
      setDocArtifacts(0.88);
    }
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    setErrorMsg(null);

    const payload: CasePayload = {
      text: text.trim() || undefined,
      url: url.trim() || undefined,
      transaction: {
        amount,
        avg_amount_30d: avgAmount30d,
        amount_to_avg_ratio: avgAmount30d > 0 ? Number((amount / avgAmount30d).toFixed(3)) : 1.0,
        hour_of_day: hourOfDay,
        txn_count_24h: txnCount24h,
        new_device: newDevice,
        geo_distance_km: geoDistanceKm,
        account_age_days: accountAgeDays,
        failed_logins_24h: failedLogins24h,
      },
      identity: {
        name_matches_id: nameMatchesId,
        device_known: deviceKnown,
        location_plausible: locationPlausible,
        contact_info_match: contactInfoMatch,
      },
      media_features: {
        voice_spectral_flatness: voiceFlatness,
        face_landmark_jitter: faceJitter,
        document_compression_artifacts: docArtifacts,
      },
    };

    try {
      const res = await fetch('/api/v1/cases/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to analyze case');
      }

      const caseData: Case = await res.json();
      setLastResult(caseData);
      if (onScanComplete) onScanComplete(caseData);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error executing scan pipeline');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Presets */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-400" />
              Multi-Modal Threat Scanner (Pillar 1)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit multi-modal signals to trigger real-time ML detection, heuristic validation, and reliability scoring.
            </p>
          </div>

          {/* Quick Canary Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Load Canary Preset:</span>
            <button
              onClick={() => applyPreset('phishing_wire')}
              className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-semibold rounded-lg border border-red-800/80 transition"
            >
              Phishing Wire (Critical)
            </button>
            <button
              onClick={() => applyPreset('geo_takeover')}
              className="px-2.5 py-1 bg-orange-950/60 hover:bg-orange-900 text-orange-300 text-xs font-semibold rounded-lg border border-orange-800/80 transition"
            >
              Account Takeover (High)
            </button>
            <button
              onClick={() => applyPreset('benign_grocery')}
              className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-800/80 transition"
            >
              Grocery Delivery (Benign)
            </button>
            <button
              onClick={() => applyPreset('ood_extreme')}
              className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900 text-purple-300 text-xs font-semibold rounded-lg border border-purple-800/80 transition"
            >
              OOD Outlier Test
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-950/80 border border-red-800 text-red-300 p-4 rounded-xl text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: Inputs Form & Scan Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Multi-modal Input Fields (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Text & URL Group */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Text & URL Channels</span>
              <span className="text-[11px] text-blue-400 font-mono">M1/M2 ML + Rule-Based</span>
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Message Body / Notification Content
              </label>
              <textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste SMS, transaction memo, or communication..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Target URL / Landing Link
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g. http://bank-wire-portal.online/auth"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tabular Transaction Attributes */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Tabular Transaction Attributes</span>
              <span className="text-[11px] text-indigo-400 font-mono">M3 (RF) / M4 (ANN)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Amount ($)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">30-Day Avg ($)</label>
                <input
                  type="number"
                  value={avgAmount30d}
                  onChange={(e) => setAvgAmount30d(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Hour of Day (0–23)</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hourOfDay}
                  onChange={(e) => setHourOfDay(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">24h Txn Count</label>
                <input
                  type="number"
                  value={txnCount24h}
                  onChange={(e) => setTxnCount24h(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Geo Distance (km)</label>
                <input
                  type="number"
                  value={geoDistanceKm}
                  onChange={(e) => setGeoDistanceKm(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Failed Logins (24h)</label>
                <input
                  type="number"
                  value={failedLogins24h}
                  onChange={(e) => setFailedLogins24h(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Account Age (Days)</label>
                <input
                  type="number"
                  value={accountAgeDays}
                  onChange={(e) => setAccountAgeDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">New Device?</label>
                <select
                  value={newDevice}
                  onChange={(e) => setNewDevice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value={0}>No (Recognized Device)</option>
                  <option value={1}>Yes (New Device Signature)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Amount / Avg Ratio</label>
                <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-slate-300 font-mono">
                  {avgAmount30d > 0 ? (amount / avgAmount30d).toFixed(2) + 'x' : '1.0x'}
                </div>
              </div>
            </div>
          </div>

          {/* Identity Verification Heuristics */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Identity Verification Heuristics</span>
              <span className="text-[11px] text-amber-400 font-mono">RULE_BASED (Weight: 10%)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nameMatchesId}
                  onChange={(e) => setNameMatchesId(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span className="text-slate-300">Name matches ID record</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deviceKnown}
                  onChange={(e) => setDeviceKnown(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span className="text-slate-300">Device signature recognized</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={locationPlausible}
                  onChange={(e) => setLocationPlausible(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span className="text-slate-300">Location Plausible (Geo-velocity OK)</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactInfoMatch}
                  onChange={(e) => setContactInfoMatch(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span className="text-slate-300">Contact phone/email matches profile</span>
              </label>
            </div>
          </div>

          {/* Biometrics & Multimedia Forensics Stubs (MOCK) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>Biometrics & Document Forensics</span>
                <span className="px-2 py-0.5 bg-purple-950 text-purple-400 border border-purple-800 text-[10px] font-bold rounded">
                  MOCK STUBS
                </span>
              </h3>
              <span className="text-[11px] text-slate-500 italic">IEEE 830 MVP Scope</span>
            </div>

            <p className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <strong className="text-purple-400">Disclaimer:</strong> Simulated heuristic stubs to demonstrate multi-modal extensibility. Not certified for production biometric forensics.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  Voice Flatness ({Math.round(voiceFlatness * 100)}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={voiceFlatness}
                  onChange={(e) => setVoiceFlatness(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Face Landmark Jitter ({Math.round(faceJitter * 100)}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={faceJitter}
                  onChange={(e) => setFaceJitter(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Document Artifacts ({Math.round(docArtifacts * 100)}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={docArtifacts}
                  onChange={(e) => setDocArtifacts(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Trigger Scan Button */}
          <button
            onClick={handleRunScan}
            disabled={isScanning}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isScanning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Executing Multi-Modal Pipelines...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Analyze Threat Payload
              </>
            )}
          </button>
        </div>

        {/* Right Column: Live Detection & Reliability Output (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {lastResult ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
              {/* Top Score Box */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Case #{lastResult.id} Assessment
                  </span>
                  <span className={`text-2xl font-black ${
                    lastResult.risk_level === 'Critical' ? 'text-red-400' :
                    lastResult.risk_level === 'High' ? 'text-orange-400' :
                    lastResult.risk_level === 'Medium' ? 'text-amber-400' :
                    'text-emerald-400'
                  }`}>
                    {lastResult.risk_level.toUpperCase()} RISK
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-4xl font-extrabold text-white font-mono">
                    {lastResult.risk_score}
                  </span>
                  <span className="text-xs text-slate-500 block">/ 100 score</span>
                </div>
              </div>

              {/* Reliability Rating Box ("Can I trust the AI decision?") */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                    Model Decision Reliability
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    lastResult.reliability_level === 'High' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    lastResult.reliability_level === 'Medium' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-red-950 text-red-400 border border-red-800'
                  }`}>
                    {lastResult.reliability_level} Reliability ({(lastResult.reliability_score || 0).toFixed(2)})
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "{lastResult.reliability_detail?.trust_question}"
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {lastResult.reliability_detail?.is_ood && (
                    <span className="px-2 py-0.5 bg-red-950/80 text-red-300 text-[10px] font-bold rounded border border-red-800">
                      OOD Detected (+6 bonus)
                    </span>
                  )}
                  {lastResult.reliability_detail?.has_disagreement && (
                    <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 text-[10px] font-bold rounded border border-amber-800">
                      Model Disagreement (+3 bonus)
                    </span>
                  )}
                  {lastResult.needs_human_review && (
                    <span className="px-2 py-0.5 bg-blue-950/80 text-blue-300 text-[10px] font-bold rounded border border-blue-800">
                      Routed to Human Review
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Risk Weight Contribution Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Signal Contributions (Dynamic Re-normalization)
                </h4>
                <div className="space-y-1.5 text-xs">
                  {lastResult.risk_detail?.breakdown.map((item) => (
                    <div
                      key={item.signal}
                      className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800/80"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-200">{item.signal}</span>
                          <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-400">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Weight: {item.weight_pct}% | Raw: {item.raw_value}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-white">
                        +{item.points_contributed} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detectors Detail List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Module Outputs & Details
                </h4>
                <div className="space-y-2 text-xs">
                  {lastResult.detections.slice(0, 5).map((d) => (
                    <div key={d.module} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-300 uppercase text-[11px]">{d.module}</span>
                        <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                          d.probability > 0.5 ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'
                        }`}>
                          {d.prediction} ({(d.probability * 100).toFixed(0)}%)
                        </span>
                      </div>

                      {d.details?.top_terms && d.details.top_terms.length > 0 && (
                        <div className="mt-1.5 text-[11px] text-slate-400">
                          Top terms: {d.details.top_terms.map((t: any) => `${t.term} (${t.contribution})`).join(', ')}
                        </div>
                      )}

                      {d.details?.triggered_rules && d.details.triggered_rules.length > 0 && (
                        <div className="mt-1.5 text-[11px] text-amber-300">
                          Triggered: {d.details.triggered_rules.join('; ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {onNavigateToCases && (
                <button
                  onClick={onNavigateToCases}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1 transition"
                >
                  View in All Cases Table <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No Scan Executed Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Select a preset above or enter custom inputs to trigger the ML & rule detection pipeline.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
