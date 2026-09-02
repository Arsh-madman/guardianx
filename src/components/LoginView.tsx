import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('parent@gmail.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error('Login failed. Please check credentials.');
      }

      const data = await res.json();
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to GuardianX server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-[#10201B] border border-[#214235] shadow-2xl space-y-6">
        {/* LOGO */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#B8F36B] flex items-center justify-center text-[#08110F] text-3xl font-black shadow-xl shadow-[#B8F36B]/20">
            G
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider text-white">GUARDIANX</h1>
            <p className="text-xs text-[#7C9B8A] font-semibold tracking-wider">
              CONSENT-BASED FAMILY SAFETY
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-200 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#7C9B8A] uppercase tracking-wider">
              Parent Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#7C9B8A] absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#08110F] border border-[#214235] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#B8F36B]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#7C9B8A] uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#7C9B8A] absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#08110F] border border-[#214235] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#B8F36B]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#B8F36B] hover:bg-[#A3E550] active:scale-[0.99] text-[#08110F] font-black text-xs tracking-wider rounded-xl shadow-lg shadow-[#B8F36B]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{loading ? 'SIGNING IN...' : 'SIGN IN TO PARENT PORTAL'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* DEMO CREDENTIAL HELPER */}
        <div className="p-3.5 rounded-xl bg-[#08110F] border border-[#214235] text-xs text-[#7C9B8A] space-y-1">
          <div className="font-bold text-white flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#B8F36B]" /> Demo Credentials Ready
          </div>
          <div>Parent Email: <span className="text-gray-300 font-mono">parent@gmail.com</span></div>
          <div>Child Device: <span className="text-gray-300 font-mono">Rahul (Age 12)</span></div>
        </div>
      </div>
    </div>
  );
};
