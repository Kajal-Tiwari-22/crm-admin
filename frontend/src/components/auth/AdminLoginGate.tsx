'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Zap, AlertCircle, ArrowRight } from 'lucide-react';

export default function AdminLoginGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loginAdmin, isFirebaseConnected, firebaseProjectId } = useCRM();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, render the full CRM
  if (isAuthenticated) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await loginAdmin(email, password);
      if (!res.success) {
        setError(res.message || 'Invalid email or password.');
      }
    } catch {
      setError('An unexpected error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Brand Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-xl shadow-emerald-500/20 text-white mb-4 ring-4 ring-white/10">
            <Zap className="w-9 h-9 fill-current" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            MOTORSHANDILYA <span className="text-emerald-400">EV CRM</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">
            Owned and managed by Deen Dayak Tiwari
          </p>
        </div>

        {/* Login Form Box */}
        <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Admin Sign In</h2>
              <p className="text-xs text-slate-500">Enter showroom credentials to access</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Protected</span>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Email ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@voltriderev.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-sm font-medium text-slate-900 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-sm font-medium text-slate-900 outline-none transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Sign In as Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 mt-2">
              Single administrator access · Secured by the CRM backend
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 flex items-center justify-between text-xs text-slate-400 px-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isFirebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>MongoDB: {firebaseProjectId}</span>
          </div>
          <span>v2.4 Pro Production</span>
        </div>
      </div>
    </div>
  );
}
