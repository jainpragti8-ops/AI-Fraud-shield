import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ThreatScannerView } from './components/ThreatScannerView';
import { CasesAndReviewsView } from './components/CasesAndReviewsView';
import { ModelHealthView } from './components/ModelHealthView';
import { RobustnessScannerView } from './components/RobustnessScannerView';
import { AlertsAndAuditView } from './components/AlertsAndAuditView';
import { ConfigView } from './components/ConfigView';
import { Role, Case } from './types';
import { handleClientApiRequest } from './services/clientApi';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<Role>('admin');
  const [stats, setStats] = useState<any>(() => handleClientApiRequest('/api/v1/dashboard/stats'));

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        return;
      }
    } catch (e) {
      console.warn('Network stats fetch error, falling back to local store', e);
    }
    const fallback = handleClientApiRequest('/api/v1/dashboard/stats');
    if (fallback) setStats(fallback);
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleScanComplete = (_newCase: Case) => {
    fetchStats();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        openAlertsCount={stats?.open_alerts_count || 0}
        pendingReviewsCount={stats?.pending_reviews_count || 0}
        healthStatus={stats?.health_status || 'HEALTHY'}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView stats={stats} onNavigate={(tab) => setActiveTab(tab)} />
        )}
        {activeTab === 'scanner' && (
          <ThreatScannerView
            onScanComplete={handleScanComplete}
            onNavigateToCases={() => setActiveTab('cases')}
          />
        )}
        {activeTab === 'cases' && (
          <CasesAndReviewsView
            currentRole={currentRole}
            onReviewSubmitted={fetchStats}
          />
        )}
        {activeTab === 'health' && <ModelHealthView />}
        {activeTab === 'robustness' && <RobustnessScannerView />}
        {activeTab === 'alerts' && (
          <AlertsAndAuditView currentRole={currentRole} onAlertUpdated={fetchStats} />
        )}
        {activeTab === 'config' && <ConfigView currentRole={currentRole} />}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        AI FraudShield v1.0.0 • Multi-Modal Threat Detection & Model Reliability Surveillance System • IEEE 830 / ISO 29148 Standard Architecture
      </footer>
    </div>
  );
}
