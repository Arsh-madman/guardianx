import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, LayoutGrid, Radio, RefreshCw, LogOut } from 'lucide-react';
import { ParentDashboard } from './components/ParentDashboard';
import { ChildDeviceView } from './components/ChildDeviceView';
import { LoginView } from './components/LoginView';
import { RoleSelectView } from './components/RoleSelectView';
import { User, UserRole } from './types';
import { apiClient } from './utils/api';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deviceRole, setDeviceRole] = useState<UserRole | null>(null);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [viewMode, setViewMode] = useState<'parent' | 'child' | 'split'>('parent');
  const [loading, setLoading] = useState(true);

  // Check for existing device role (localStorage or session)
  useEffect(() => {
    const savedRole = localStorage.getItem('guardianx_device_role') as UserRole | null;
    const savedUser = localStorage.getItem('guardianx_user');
    
    if (savedRole) setDeviceRole(savedRole);
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('guardianx_user');
      }
    }
    
    setLoading(false);
  }, []);

  const handleRoleSelected = (role: UserRole, user: User) => {
    setDeviceRole(role);
    setCurrentUser(user);
    localStorage.setItem('guardianx_device_role', role);
    localStorage.setItem('guardianx_user', JSON.stringify(user));
    setShowRoleSelect(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowRoleSelect(true);
    // Note: Don't clear device role on logout - device stays locked to its role
  };

  const handleFactoryReset = () => {
    localStorage.removeItem('guardianx_device_role');
    localStorage.removeItem('guardianx_user');
    setDeviceRole(null);
    setCurrentUser(null);
    setShowRoleSelect(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08110F] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#B8F36B] flex items-center justify-center text-[#08110F] text-3xl font-black shadow-xl shadow-[#B8F36B]/20 mx-auto mb-4">
            G
          </div>
          <p className="text-[#7C9B8A]">Initializing GuardianX...</p>
        </div>
      </div>
    );
  }

  if (showRoleSelect || (!currentUser && !deviceRole)) {
    return <RoleSelectView onRoleSelected={handleRoleSelected} onBack={() => setShowRoleSelect(false)} />;
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // Device-role isolation: If device is locked to a role, only show that view
  if (deviceRole === 'parent' && viewMode !== 'parent') {
    // Force parent view on parent device
    const lockViewMode = 'parent';
  } else if (deviceRole === 'child' && viewMode !== 'child') {
    // Force child view on child device
    const lockViewMode = 'child';
  }

  const effectiveViewMode = 
    deviceRole === 'parent' ? 'parent' : 
    deviceRole === 'child' ? 'child' : 
    viewMode;

  return (
    <div className="min-h-screen bg-[#08110F] text-[#F3FFF8] flex flex-col selection:bg-[#B8F36B] selection:text-[#08110F]">
      {/* GLOBAL TOP NAVIGATION BAR & MODE SWITCHER */}
      <div className="sticky top-0 z-50 bg-[#08110F]/90 backdrop-blur-md border-b border-[#214235] px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#B8F36B] flex items-center justify-center text-[#08110F] font-black text-base shadow-md shadow-[#B8F36B]/20">
              G
            </div>
            <div>
              <span className="font-black text-sm tracking-wider text-white">GUARDIANX</span>
              <span className="text-[10px] text-[#7C9B8A] font-semibold ml-2">
                {deviceRole === 'parent' ? 'Parent Portal' : deviceRole === 'child' ? 'Child Companion' : 'Family Ecosystem'}
              </span>
            </div>
          </div>

          {/* VIEW SWITCHER TABS - Only show if not device-locked */}
          {!deviceRole && (
            <div className="flex items-center p-1 bg-[#10201B] border border-[#214235] rounded-xl text-xs font-bold">
              <button
                onClick={() => setViewMode('parent')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'parent'
                    ? 'bg-[#162B24] text-[#B8F36B] shadow-sm border border-[#2C5142]'
                    : 'text-[#7C9B8A] hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Parent Portal</span>
              </button>

              <button
                onClick={() => setViewMode('child')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'child'
                    ? 'bg-[#162B24] text-[#B8F36B] shadow-sm border border-[#2C5142]'
                    : 'text-[#7C9B8A] hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Child Device</span>
              </button>

              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'split'
                    ? 'bg-[#162B24] text-[#B8F36B] shadow-sm border border-[#2C5142]'
                    : 'text-[#7C9B8A] hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Split Testing Mode</span>
              </button>
            </div>
          )}

          {/* LOGOUT & DEVICE RESET */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-[#08110F] border border-[#214235] text-[#7C9B8A] hover:text-white hover:border-[#B8F36B] transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
            {deviceRole && (
              <button
                onClick={handleFactoryReset}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-950/30 border border-red-900/50 text-red-300 hover:text-red-100 transition-all"
                title="Reset device role"
              >
                Reset Device
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BODY CONTENT */}
      <main className="flex-1 pb-12">
        {effectiveViewMode === 'parent' ? (
          <ParentDashboard
            user={currentUser}
            onLogout={handleLogout}
            onSwitchToChild={!deviceRole ? () => setViewMode('child') : undefined}
          />
        ) : effectiveViewMode === 'child' ? (
          <ChildDeviceView 
            onSwitchToParent={!deviceRole ? () => setViewMode('parent') : undefined}
          />
        ) : (
          /* SPLIT MULTI-VIEW */
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="mb-4 p-3 bg-[#162B24] border border-[#2C5142] rounded-2xl flex items-center justify-between text-xs text-[#B8F36B]">
              <span className="font-semibold flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                Live Split-Screen Test Environment: Trigger capability requests on the left to see device responses on the right.
              </span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-8">
                <ParentDashboard
                  user={currentUser}
                  onLogout={handleLogout}
                  onSwitchToChild={() => setViewMode('child')}
                />
              </div>
              <div className="xl:col-span-4">
                <ChildDeviceView
                  onSwitchToParent={() => setViewMode('parent')}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
