import React, { useState } from 'react';
import { Shield, Smartphone, ArrowRight, Zap } from 'lucide-react';
import { User, UserRole } from '../types';
import { apiClient } from '../utils/api';

interface RoleSelectViewProps {
  onRoleSelected: (role: UserRole, user: User) => void;
  onBack: () => void;
}

export const RoleSelectView: React.FC<RoleSelectViewProps> = ({ onRoleSelected, onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'role'>('email');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setError(null);
      
      // Try to login - if user doesn't exist, it will be created
      const response = await apiClient.login(email, 'password123');
      
      if (response && response.user) {
        // Move to role selection
        setStep('role');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = async (role: UserRole) => {
    try {
      setLoading(true);
      
      // Create user with selected role
      const user: User = {
        id: Math.random() * 1000,
        email,
        full_name: email.split('@')[0] || 'User',
        role,
        created_at: new Date().toISOString(),
      };
      
      onRoleSelected(role, user);
    } catch (err) {
      setError('Failed to set up device role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08110F] text-[#F3FFF8] flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-[#10201B] border border-[#214235] shadow-2xl space-y-6">
        {/* LOGO */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#B8F36B] flex items-center justify-center text-[#08110F] text-3xl font-black shadow-xl shadow-[#B8F36B]/20">
            G
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider text-white">GUARDIANX</h1>
            <p className="text-xs text-[#7C9B8A] font-semibold tracking-wider">
              FAMILY SAFETY SETUP
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-200 text-center">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#7C9B8A] uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-[#08110F] border border-[#214235] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#B8F36B]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#B8F36B] text-[#08110F] font-black text-sm transition-all hover:shadow-lg hover:shadow-[#B8F36B]/30 disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Continue'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <p className="text-sm text-[#7C9B8A]">Select your device role</p>
              <p className="text-xs text-[#5a7a71] mt-1">This device will be locked to the selected role</p>
            </div>

            {/* PARENT OPTION */}
            <button
              onClick={() => handleRoleSelection('parent')}
              disabled={loading}
              className="w-full p-5 rounded-2xl border border-[#214235] bg-[#08110F] hover:bg-[#162B24] transition-all text-left space-y-3 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-[#B8F36B]/20 group-hover:bg-[#B8F36B]/30 transition-all">
                  <Shield className="w-5 h-5 text-[#B8F36B]" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm">Parent Portal</h3>
                  <p className="text-xs text-[#7C9B8A]">Monitor & manage child safety</p>
                </div>
              </div>
              <p className="text-xs text-[#5a7a71] pl-12">
                Access: Location tracking, live surveillance, app usage, geofencing, SOS alerts
              </p>
            </button>

            {/* CHILD OPTION */}
            <button
              onClick={() => handleRoleSelection('child')}
              disabled={loading}
              className="w-full p-5 rounded-2xl border border-[#214235] bg-[#08110F] hover:bg-[#162B24] transition-all text-left space-y-3 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-[#B8F36B]/20 group-hover:bg-[#B8F36B]/30 transition-all">
                  <Smartphone className="w-5 h-5 text-[#B8F36B]" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm">Child Companion</h3>
                  <p className="text-xs text-[#7C9B8A]">Grant parent access permissions</p>
                </div>
              </div>
              <p className="text-xs text-[#5a7a71] pl-12">
                Share: Location, camera, microphone, app list with parent consent control
              </p>
            </button>

            <button
              onClick={onBack}
              className="w-full py-2.5 rounded-xl bg-[#08110F] border border-[#214235] text-[#7C9B8A] font-semibold text-sm hover:text-white transition-all"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
