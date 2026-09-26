import React from 'react';
import {
  ShieldAlert,
  Activity,
  Search,
  Inbox,
  BarChart3,
  Sliders,
  BellRing,
  UserCheck,
} from 'lucide-react';
import { Role } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  openAlertsCount: number;
  pendingReviewsCount: number;
  healthStatus: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  setCurrentRole,
  openAlertsCount,
  pendingReviewsCount,
  healthStatus,
}) => {
  const getStatusBadge = () => {
    if (healthStatus.includes('FAILURE')) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950 text-red-400 border border-red-800 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          FAIL ALERT
        </span>
      );
    }
    if (healthStatus.includes('ALERT')) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          HEALTH WARN
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        HEALTHY
      </span>
    );
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'scanner', label: 'Threat Scanner', icon: Search },
    { id: 'cases', label: 'Cases & Review', icon: Inbox, count: pendingReviewsCount },
    { id: 'health', label: 'Model Health & Drift', icon: Activity },
    { id: 'robustness', label: 'Defensive Scanner', icon: ShieldAlert },
    { id: 'alerts', label: 'Alerts & Audit', icon: BellRing, count: openAlertsCount },
    { id: 'config', label: 'Configuration & Models', icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-500/20 text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">
                  AI FraudShield
                </span>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-slate-400">
                Threat Detection & Model Reliability Guard
              </p>
            </div>
          </div>

          {/* Role selector & Quick Switch */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 font-medium">Role:</span>
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as Role)}
                className="bg-transparent text-white font-semibold outline-none cursor-pointer hover:text-blue-300"
              >
                <option value="admin" className="bg-slate-900 text-white">Admin (Full Access)</option>
                <option value="analyst" className="bg-slate-900 text-white">Analyst (Review & Ops)</option>
                <option value="auditor" className="bg-slate-900 text-white">Auditor (Read-Only)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
