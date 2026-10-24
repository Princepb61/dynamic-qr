import React, { useState } from 'react';
import { UserRecord } from '../types';
import { api } from '../services/api';
import {
  QrCode,
  Shield,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  KeyRound,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface AuthPageProps {
  onLoginSuccess: (user: UserRecord, token: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [tab, setTab] = useState<'admin' | 'client'>('admin');
  const [clientMode, setClientMode] = useState<'login' | 'register'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);

  // Quick fill helper for Admin credentials
  const fillAdminCredentials = () => {
    setEmail('p0667500@gmail.com');
    setPassword('P4prince.com');
    setError(null);
    setPendingNotice(null);
  };

  // Quick fill helper for Approved Client
  const fillApprovedClient = () => {
    setEmail('client@company.com');
    setPassword('client123');
    setError(null);
    setPendingNotice(null);
  };

  // Quick fill helper for Pending Client
  const fillPendingClient = () => {
    setEmail('pending@startup.io');
    setPassword('client123');
    setError(null);
    setPendingNotice(null);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPendingNotice(null);

    try {
      setLoading(true);
      const res = await api.login({
        email: email.trim(),
        password,
        portalType: 'admin',
      });
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPendingNotice(null);

    try {
      setLoading(true);
      const res = await api.login({
        email: email.trim(),
        password,
        portalType: 'client',
      });
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      if (err.code === 'PENDING_APPROVAL') {
        setPendingNotice(
          'Your account is registered but currently pending administrator approval. Please wait for the administrator (p0667500@gmail.com) to approve your account in the Admin Panel.'
        );
      } else {
        setError(err.message || 'Client login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPendingNotice(null);

    try {
      setLoading(true);
      await api.registerClient({
        name: name.trim(),
        email: email.trim(),
        password,
        company: company.trim(),
      });
      setRegistrationSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100/70 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="inline-flex w-12 h-12 rounded-2xl bg-neutral-900 dark:bg-neutral-800 text-white items-center justify-center shadow-md mb-3 border border-neutral-800 dark:border-neutral-700">
          <QrCode className="w-6 h-6 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
          taplocalin
        </h1>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          Dynamic Redirect Links, Smart Buttons & QR Code Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white dark:bg-neutral-900 py-8 px-6 shadow-md rounded-2xl border border-neutral-200 dark:border-neutral-800 sm:px-10 space-y-6 transition-colors">
          {/* Main Portal Mode Switcher */}
          <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            <button
              onClick={() => {
                setTab('admin');
                setError(null);
                setPendingNotice(null);
                setEmail('');
                setPassword('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                tab === 'admin'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Shield className="w-4 h-4 text-neutral-700" />
              <span>Admin Login</span>
            </button>
            <button
              onClick={() => {
                setTab('client');
                setError(null);
                setPendingNotice(null);
                setEmail('');
                setPassword('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                tab === 'client'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <User className="w-4 h-4 text-neutral-700" />
              <span>Client Portal</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: ADMIN LOGIN */}
          {/* ========================================================================= */}
          {tab === 'admin' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-neutral-100 pb-3">
                <h2 className="text-base font-bold text-neutral-900">Administrator Access</h2>
                <p className="text-xs text-neutral-500">
                  Sign in with administrator credentials to manage all dynamic endpoints and approve client registrations.
                </p>
              </div>

              {/* Demo Credentials Quick Fill Banner */}
              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900">Configured Admin Account</span>
                  <span className="text-[11px] font-mono text-neutral-500">Master Level</span>
                </div>
                <div className="font-mono text-xs text-neutral-600 bg-white p-2 rounded border border-neutral-200 space-y-0.5">
                  <div>Email: <strong className="text-neutral-900">p0667500@gmail.com</strong></div>
                  <div>Password: <strong className="text-neutral-900">P4prince.com</strong></div>
                </div>
                <button
                  type="button"
                  onClick={fillAdminCredentials}
                  className="w-full py-1.5 px-3 text-xs font-medium text-neutral-800 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-lg transition-colors text-center"
                >
                  Click to Auto-fill Admin Credentials
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="p0667500@gmail.com"
                    required
                    className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{loading ? 'Authenticating...' : 'Sign in as Administrator'}</span>
                </button>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CLIENT PORTAL */}
          {/* ========================================================================= */}
          {tab === 'client' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Sub-tabs: Login vs Register */}
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-neutral-900">
                    {clientMode === 'login' ? 'Client Account Login' : 'Client Registration'}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {clientMode === 'login'
                      ? 'Approved clients can log in to manage their dynamic QR codes.'
                      : 'Register a new client account. Requires admin panel approval.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setClientMode(clientMode === 'login' ? 'register' : 'login');
                    setError(null);
                    setPendingNotice(null);
                    setRegistrationSuccess(false);
                  }}
                  className="text-xs font-semibold text-neutral-900 hover:underline shrink-0"
                >
                  {clientMode === 'login' ? 'Register New' : 'Back to Login'}
                </button>
              </div>

              {/* Pending Approval Callout (The core requirement!) */}
              {pendingNotice && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Account Pending Administrator Approval</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    {pendingNotice}
                  </p>
                  <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-amber-700">Administrator: p0667500@gmail.com</span>
                    <button
                      type="button"
                      onClick={() => setTab('admin')}
                      className="text-neutral-900 font-semibold underline"
                    >
                      Log in as Admin to Approve
                    </button>
                  </div>
                </div>
              )}

              {/* Registration Success Confirmation */}
              {registrationSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Registration Application Submitted!</span>
                  </div>
                  <p className="text-emerald-800 leading-relaxed">
                    Your account has been created with status <strong className="font-semibold">Pending Approval</strong>. The system administrator (<strong className="font-semibold">p0667500@gmail.com</strong>) has been notified and can approve your account in the Admin Panel.
                  </p>
                  <button
                    onClick={() => {
                      setRegistrationSuccess(false);
                      setClientMode('login');
                    }}
                    className="mt-2 py-1.5 px-3 bg-emerald-800 text-white rounded-lg font-medium"
                  >
                    Proceed to Client Login
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* CLIENT LOGIN FORM */}
              {clientMode === 'login' && !registrationSuccess && (
                <>
                  {/* Quick-Test Credentials for user convenience */}
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs space-y-2">
                    <span className="font-semibold text-neutral-800 block">Sample Test Accounts:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={fillApprovedClient}
                        className="p-2 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100 text-left transition-colors"
                      >
                        <div className="font-semibold text-emerald-700 text-[11px]">Approved Client</div>
                        <div className="text-[10px] text-neutral-500 truncate">client@company.com</div>
                      </button>
                      <button
                        type="button"
                        onClick={fillPendingClient}
                        className="p-2 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100 text-left transition-colors"
                      >
                        <div className="font-semibold text-amber-700 text-[11px]">Pending Client</div>
                        <div className="text-[10px] text-neutral-500 truncate">pending@startup.io</div>
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleClientLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Client Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="client@company.com"
                        required
                        className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      <span>{loading ? 'Verifying Approval...' : 'Log in to Client Portal'}</span>
                    </button>
                  </form>
                </>
              )}

              {/* CLIENT SELF-REGISTRATION FORM */}
              {clientMode === 'register' && !registrationSuccess && (
                <form onSubmit={handleClientRegister} className="space-y-4">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
                    <span className="font-semibold block mb-0.5">Approval Required:</span>
                    Once registered, your application will be routed to the Admin Panel for review by administrator <strong className="font-semibold">p0667500@gmail.com</strong>.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      required
                      className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Organization / Company <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Morgan Hospitality & Retail"
                      required
                      className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Work Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@morganhospitality.com"
                      required
                      className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      required
                      className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2"
                  >
                    <Building className="w-4 h-4" />
                    <span>{loading ? 'Submitting Application...' : 'Submit Application for Approval'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
