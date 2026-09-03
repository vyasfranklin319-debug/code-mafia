import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2, KeyRound, AlertCircle, Zap, Shield } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (usernameOrEmail: string) => void;
  onNavigateHome?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'IDENTIFIER' | 'PASSWORD' | 'MAGIC_LINK_SENT' | 'LOST_PASSWORD'>('IDENTIFIER');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [magicEmailSuccess, setMagicEmailSuccess] = useState(false);

  // Handle Form Submit (Step 1 -> Step 2)
  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!emailOrUsername.trim()) {
      setErrorMsg('Please enter your operative email address or username.');
      return;
    }

    if (step === 'IDENTIFIER') {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setStep('PASSWORD');
      }, 300);
    } else if (step === 'PASSWORD') {
      if (!password.trim()) {
        setErrorMsg('Please enter your security password.');
        return;
      }
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(emailOrUsername.trim());
      }, 400);
    }
  };

  // Social OAuth Login Handler
  const handleSocialLogin = (provider: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(`${provider}_Operative`);
    }, 500);
  };

  // Magic Link Handler
  const handleSendLoginLink = () => {
    if (!emailOrUsername.trim()) {
      setErrorMsg('Please enter your email address first to receive a magic login link.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setMagicEmailSuccess(true);
    }, 400);
  };

  // Password Recovery Submit
  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) {
      setErrorMsg('Please enter your Code Mafia username or email address.');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert(`Password reset security link sent to ${emailOrUsername}`);
      setStep('IDENTIFIER');
    }, 500);
  };

  return (
    <div className="min-h-screen font-sans flex flex-col justify-between py-12 px-4 select-none bg-[#090a0f] text-slate-100 relative overflow-hidden">
      
      {/* Dynamic Background Blurs */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar with Back Button & Brand Badge */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between text-xs font-bold px-4 relative z-10">
        {onNavigateHome && (
          <button 
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-wider text-[11px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Arena Hub
          </button>
        )}

        <div className="flex items-center space-x-2 bg-purple-950/50 border border-purple-800/60 px-3 py-1 rounded-full">
          <Zap className="w-3.5 h-3.5 text-purple-400 fill-current" />
          <span className="text-[10px] text-purple-300 font-mono font-bold tracking-widest uppercase">
            NEXUS AUTH v2.4
          </span>
        </div>
      </div>

      {/* Main Center Container */}
      <div className="max-w-3xl mx-auto w-full my-auto py-8 relative z-10">
        
        {/* Logo & Header Title */}
        <div className="text-center max-w-xl mx-auto space-y-4 mb-10">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 shadow-lg shadow-purple-950/80 mb-2">
            <Shield className="w-8 h-8 text-white fill-purple-400/30" />
          </div>

          <h1 className="text-4xl lg:text-5xl font-black tracking-wider uppercase text-white text-glow-purple">
            Log in to CodeMafia.com
          </h1>
          
          <p className="text-xs lg:text-sm text-slate-400 leading-relaxed">
            By continuing with any of the options below, you agree to our{' '}
            <a href="#terms" className="text-purple-400 hover:underline">Terms of Service</a> and have read our{' '}
            <a href="#privacy" className="text-purple-400 hover:underline">Privacy Policy</a>.
          </p>
        </div>

        {/* Password Recovery View */}
        {step === 'LOST_PASSWORD' ? (
          <div className="max-w-md mx-auto p-8 rounded-3xl gaming-card space-y-6">
            <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-purple-400" /> Reset Security Password
            </h2>
            <p className="text-xs text-slate-400">
              Enter your CodeMafia.com operative username or email address. We will dispatch a password reset security link to your inbox.
            </p>

            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Email address or username
                </label>
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={e => setEmailOrUsername(e.target.value)}
                  className="w-full px-4 py-3 gaming-input text-sm"
                  placeholder="e.g. operative@codemafia.com"
                  required
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 gaming-btn-purple text-sm font-bold uppercase tracking-wider"
              >
                {isLoading ? 'Dispatching...' : 'Get New Password'}
              </button>
            </form>

            <button
              onClick={() => setStep('IDENTIFIER')}
              className="block text-center text-xs text-purple-400 hover:text-purple-300 underline mx-auto uppercase font-bold"
            >
              Back to Login Options
            </button>
          </div>
        ) : magicEmailSuccess ? (
          /* Magic Link Success View */
          <div className="max-w-md mx-auto p-8 rounded-3xl gaming-card text-center space-y-4 border border-purple-500/40">
            <CheckCircle2 className="w-12 h-12 text-purple-400 mx-auto" />
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Check Your Operative Inbox</h2>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              We dispatched a magic login link to <strong className="text-purple-300">{emailOrUsername}</strong>. Click the link to authenticate instantly into the arena.
            </p>
            <button
              onClick={() => setMagicEmailSuccess(false)}
              className="text-xs font-bold text-purple-400 hover:text-purple-300 underline uppercase block pt-2"
            >
              Return to Login Options
            </button>
          </div>
        ) : (
          /* Split Gaming Card Layout (Dark Theme Matching Site) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-2xl mx-auto gaming-card p-8 relative">
            
            {/* LEFT COLUMN: Email / Username Input Form */}
            <div className="space-y-4">
              <form onSubmit={handleContinue} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                    {step === 'PASSWORD' ? 'Security Password' : 'Email address or username'}
                  </label>
                  
                  {step === 'IDENTIFIER' ? (
                    <input
                      type="text"
                      autoFocus
                      value={emailOrUsername}
                      onChange={e => setEmailOrUsername(e.target.value)}
                      placeholder="Enter email or username..."
                      className="w-full px-4 py-3 gaming-input text-sm"
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex justify-between items-center font-mono">
                        <span className="font-bold text-purple-300">{emailOrUsername}</span>
                        <button 
                          type="button" 
                          onClick={() => setStep('IDENTIFIER')}
                          className="text-purple-400 hover:text-purple-300 underline text-[11px] uppercase font-sans font-bold"
                        >
                          Change
                        </button>
                      </div>
                      <input
                        type="password"
                        autoFocus
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter password..."
                        className="w-full px-4 py-3 gaming-input text-sm"
                      />
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-2xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 gaming-btn-purple text-sm font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <span>{step === 'PASSWORD' ? 'Log In to Arena' : 'Continue'}</span>
                  )}
                </button>
              </form>
            </div>

            {/* CENTER VERTICAL DIVIDER */}
            <div className="hidden md:flex flex-col items-center absolute left-1/2 -ml-3 pointer-events-none">
              <div className="w-[1px] h-12 bg-white/10" />
              <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest my-2 bg-[#12131c] px-2 py-0.5 rounded-full border border-purple-500/30">
                OR
              </span>
              <div className="w-[1px] h-12 bg-white/10" />
            </div>

            {/* RIGHT COLUMN: Social OAuth Logins (Jetpack App REMOVED) */}
            <div className="space-y-3">
              
              {/* Google */}
              <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                className="w-full py-3 px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/40 text-xs font-bold text-slate-200 flex items-center justify-center gap-3 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Apple */}
              <button
                type="button"
                onClick={() => handleSocialLogin('Apple')}
                className="w-full py-3 px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/40 text-xs font-bold text-slate-200 flex items-center justify-center gap-3 transition-all"
              >
                <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.68-.82 1.14-1.97.01-3.12-1.01.04-2.24.68-2.95 1.51-.62.72-1.16 1.89-1.01 3.02 1.13.09 2.28-.59 2.95-1.41z"/>
                </svg>
                <span>Continue with Apple</span>
              </button>

              {/* GitHub */}
              <button
                type="button"
                onClick={() => handleSocialLogin('GitHub')}
                className="w-full py-3 px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/40 text-xs font-bold text-slate-200 flex items-center justify-center gap-3 transition-all"
              >
                <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                <span>Continue with GitHub</span>
              </button>

              {/* Email Me a Login Link */}
              <button
                type="button"
                onClick={handleSendLoginLink}
                className="w-full py-3 px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/40 text-xs font-bold text-slate-200 flex items-center justify-center gap-3 transition-all"
              >
                <Mail className="w-4 h-4 text-purple-400" />
                <span>Email me a login link</span>
              </button>

              {/* Jetpack app REMOVED */}
            </div>
          </div>
        )}

        {/* Bottom Password Reset Link */}
        {step !== 'LOST_PASSWORD' && !magicEmailSuccess && (
          <div className="text-center mt-10">
            <button
              type="button"
              onClick={() => { setErrorMsg(''); setStep('LOST_PASSWORD'); }}
              className="text-xs text-purple-400 hover:text-purple-300 underline font-bold uppercase tracking-wider"
            >
              Lost your password?
            </button>
          </div>
        )}

      </div>

      {/* Footer Branding */}
      <footer className="text-center text-[11px] font-mono text-slate-500 uppercase tracking-widest relative z-10">
        <span>Code Mafia Inc. • CodeMafia.com</span>
      </footer>

    </div>
  );
};
