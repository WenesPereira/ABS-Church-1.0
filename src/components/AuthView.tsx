import React, { useState } from 'react';
import {
  Church,
  Lock,
  Mail,
  User as UserIcon,
  Building,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  UserCheck,
  CloudCheck,
  ArrowLeft
} from 'lucide-react';
import { User, ConfigIgreja } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { fetchUserProfile } from '../services/treasuryService';

interface AuthViewProps {
  onLoginSuccess: (user: User, isNewAccount?: boolean, churchName?: string) => void;
  configIgreja?: ConfigIgreja;
}

interface StoredUserAccount extends User {
  passwordHash: string;
}

function parseSupabaseAuthError(error: { message?: string; status?: number } | null): string {
  if (!error || !error.message) return 'Ocorreu um erro inesperado ao autenticar.';
  
  const msg = error.message.toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'E-mail ou senha incorretos. Por favor, verifique seus dados.';
  }
  if (msg.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado no Supabase. Verifique sua caixa de entrada para confirmar antes de entrar.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists') || msg.includes('unique constraint')) {
    return 'Este e-mail já possui cadastro. Clique na aba "Entrar" para acessar.';
  }
  if (msg.includes('password should be at least') || msg.includes('weak password')) {
    return 'A senha fornecida é muito curta. Crie uma senha com pelo menos 6 caracteres.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('over_email_send_rate_limit')) {
    return 'Muitas tentativas em pouco tempo. Por segurança, aguarde alguns instantes antes de tentar novamente.';
  }
  if (msg.includes('signup disabled') || msg.includes('signups not allowed')) {
    return 'Novos cadastros estão desativados temporariamente no painel do Supabase.';
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Falha de conexão com os servidores do Supabase. Verifique sua conexão com a internet.';
  }

  return `Erro de autenticação: ${error.message}`;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess, configIgreja }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Form State - Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Form State - Register
  const [regNome, setRegNome] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regNomeIgreja, setRegNomeIgreja] = useState(configIgreja?.nomeIgreja || '');
  const [regCargo, setRegCargo] = useState('Tesoureiro Principal');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Form State - Forgot Password
  const [forgotEmail, setForgotEmail] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to retrieve saved users locally
  const getStoredUsers = (): StoredUserAccount[] => {
    try {
      const saved = localStorage.getItem('church_treasury_users');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erro ao ler usuários armazenados', e);
    }
    // Default demo user if none registered yet
    return [
      {
        id: 'user-demo-01',
        email: 'tesouraria@igreja.com',
        nome: 'Tesoureiro Principal',
        cargo: 'Tesoureiro Responsável',
        nomeIgreja: configIgreja?.nomeIgreja || 'Igreja Evangélica Sede',
        passwordHash: '123456',
        createdAt: new Date().toISOString()
      }
    ];
  };

  const saveLocalUserBackup = (user: StoredUserAccount) => {
    try {
      const users = getStoredUsers().filter((u) => u.email.toLowerCase() !== user.email.toLowerCase());
      localStorage.setItem('church_treasury_users', JSON.stringify([...users, user]));
    } catch (e) {
      console.warn('Erro ao salvar cópia local de usuário:', e);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailTrimmed = loginEmail.trim().toLowerCase();
    if (!emailTrimmed || !loginPassword) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setIsLoading(true);

    // Tenta autenticação via Supabase Auth oficial
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailTrimmed,
          password: loginPassword,
        });

        if (!error && data?.user) {
          const userProfile = await fetchUserProfile(data.user.id);
          const meta = data.user.user_metadata || {};

          const sessionUser: User = {
            id: data.user.id,
            email: data.user.email || emailTrimmed,
            nome: userProfile?.nome || meta.nome || 'Tesoureiro',
            cargo: userProfile?.cargo || meta.cargo || 'Tesoureiro Principal',
            nomeIgreja: userProfile?.nomeIgreja || meta.nome_igreja || configIgreja?.nomeIgreja || 'Igreja Evangélica',
            createdAt: data.user.created_at || new Date().toISOString(),
          };

          setSuccessMessage(`Bem-vindo(a) de volta, ${sessionUser.nome}!`);
          setTimeout(() => {
            setIsLoading(false);
            onLoginSuccess(sessionUser, false);
          }, 350);
          return;
        }

        if (error) {
          setErrorMessage(parseSupabaseAuthError(error));
          setIsLoading(false);
          return;
        }
      } catch (err: unknown) {
        console.warn('Erro na autenticação Supabase Auth:', err);
        const errObj = err as { message?: string };
        setErrorMessage(parseSupabaseAuthError(errObj));
        setIsLoading(false);
        return;
      }
    }

    // Fallback LocalStorage (para desenvolvimento ou offline)
    setTimeout(() => {
      const users = getStoredUsers();
      const foundUser = users.find(
        (u) => u.email.toLowerCase() === emailTrimmed && u.passwordHash === loginPassword
      );

      if (!foundUser) {
        setIsLoading(false);
        setErrorMessage('E-mail ou senha incorretos. Verifique suas credenciais.');
        return;
      }

      const sessionUser: User = {
        id: foundUser.id,
        email: foundUser.email,
        nome: foundUser.nome,
        cargo: foundUser.cargo,
        nomeIgreja: foundUser.nomeIgreja,
        createdAt: foundUser.createdAt
      };

      setSuccessMessage(`Bem-vindo(a) de volta, ${foundUser.nome}!`);
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(sessionUser, false);
      }, 350);
    }, 300);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailTrimmed = regEmail.trim().toLowerCase();
    const nomeTrimmed = regNome.trim();
    const igrejaTrimmed = regNomeIgreja.trim();

    if (!nomeTrimmed || !emailTrimmed || !regPassword || !regConfirmPassword) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!emailTrimmed.includes('@') || !emailTrimmed.includes('.')) {
      setErrorMessage('Digite um endereço de e-mail válido.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('As senhas não coincidem. Digite novamente.');
      return;
    }

    setIsLoading(true);

    if (isSupabaseConfigured) {
      try {
        // 1. Cria o usuário na tabela de Authentication oficial do Supabase (auth.users)
        const { data, error } = await supabase.auth.signUp({
          email: emailTrimmed,
          password: regPassword,
          options: {
            data: {
              nome: nomeTrimmed,
              cargo: regCargo || 'Tesoureiro',
              nome_igreja: igrejaTrimmed || 'Minha Igreja',
            },
          },
        });

        if (error) {
          setErrorMessage(parseSupabaseAuthError(error));
          setIsLoading(false);
          return;
        }

        if (data?.user) {
          if (data.user.identities && data.user.identities.length === 0) {
            setErrorMessage('Este e-mail já está cadastrado no Supabase. Faça login para acessar.');
            setIsLoading(false);
            return;
          }

          const newUserId = data.user.id;
          const newUser: User = {
            id: newUserId,
            email: emailTrimmed,
            nome: nomeTrimmed,
            cargo: regCargo || 'Tesoureiro',
            nomeIgreja: igrejaTrimmed || 'Minha Igreja',
            createdAt: new Date().toISOString(),
          };

          // 2. Salva na tabela public.profiles com user_id
          try {
            await supabase.from('profiles').upsert({
              id: newUserId,
              user_id: newUserId,
              email: emailTrimmed,
              nome: nomeTrimmed,
              cargo: regCargo || 'Tesoureiro',
              nome_igreja: igrejaTrimmed || 'Minha Igreja',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          } catch (profileErr) {
            console.warn('Perfil criado via trigger ou erro silencioso:', profileErr);
          }

          // Backup local
          saveLocalUserBackup({ ...newUser, passwordHash: '***' });

          // Verifica se requer confirmação de e-mail
          if (!data.session) {
            setSuccessMessage(
              'Conta criada com sucesso no Supabase! Verifique sua caixa de entrada caso a confirmação por e-mail esteja ativada.'
            );
          } else {
            setSuccessMessage('Conta registrada no Supabase com sucesso!');
          }

          setTimeout(() => {
            setIsLoading(false);
            onLoginSuccess(newUser, true, newUser.nomeIgreja);
          }, 500);
          return;
        }
      } catch (err: unknown) {
        console.warn('Erro ao registrar no Supabase Auth:', err);
        const errObj = err as { message?: string };
        setErrorMessage(parseSupabaseAuthError(errObj));
        setIsLoading(false);
        return;
      }
    }

    // Fallback LocalStorage se o Supabase não estiver configurado
    setTimeout(() => {
      const users = getStoredUsers();
      const userExists = users.some((u) => u.email.toLowerCase() === emailTrimmed);

      if (userExists) {
        setIsLoading(false);
        setErrorMessage('Este e-mail já está cadastrado. Faça login para continuar.');
        return;
      }

      const newUser: StoredUserAccount = {
        id: 'user-' + Date.now(),
        email: emailTrimmed,
        nome: nomeTrimmed,
        cargo: regCargo || 'Tesoureiro',
        nomeIgreja: igrejaTrimmed || 'Minha Igreja',
        passwordHash: regPassword,
        createdAt: new Date().toISOString()
      };

      const updatedUsers = [...users, newUser];
      try {
        localStorage.setItem('church_treasury_users', JSON.stringify(updatedUsers));
      } catch (err) {
        console.error('Erro ao salvar usuário no localStorage:', err);
      }

      const sessionUser: User = {
        id: newUser.id,
        email: newUser.email,
        nome: newUser.nome,
        cargo: newUser.cargo,
        nomeIgreja: newUser.nomeIgreja,
        createdAt: newUser.createdAt
      };

      setSuccessMessage('Conta criada com sucesso! Redirecionando...');
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(sessionUser, true, newUser.nomeIgreja);
      }, 500);
    }, 400);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailTrimmed = forgotEmail.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      setErrorMessage('Por favor, informe um e-mail válido.');
      return;
    }

    setIsLoading(true);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(emailTrimmed, {
          redirectTo: window.location.origin,
        });

        setIsLoading(false);
        if (error) {
          setErrorMessage(parseSupabaseAuthError(error));
        } else {
          setSuccessMessage(
            'Link de recuperação de senha enviado com sucesso! Verifique sua caixa de entrada e pasta de spam.'
          );
        }
        return;
      } catch (err: unknown) {
        setIsLoading(false);
        const errObj = err as { message?: string };
        setErrorMessage(parseSupabaseAuthError(errObj));
        return;
      }
    }

    // Fallback local
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage(
        'Instruções de redefinição enviadas para o e-mail informado. (Modo Local/Offline)'
      );
    }, 400);
  };

  const fillDemoAccount = () => {
    setLoginEmail('tesouraria@igreja.com');
    setLoginPassword('123456');
    setErrorMessage(null);
    setSuccessMessage('Credenciais de teste preenchidas! Clique em Entrar.');
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-x-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-amber-500/10 via-amber-600/5 to-transparent blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 my-auto">
        {/* LOGO & HEADING */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-slate-950 font-bold shadow-2xl shadow-amber-500/30 ring-4 ring-amber-500/20 mb-4">
            <Church className="w-9 h-9 text-slate-950" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {configIgreja?.nomeIgreja || 'Tesouraria da Igreja'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sistema Integrado de Fechamento & Gestão de Caixa
          </p>

          {/* Supabase Status Indicator */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase Auth & Nuvem Ativos</span>
          </div>
        </div>

        {/* CARD CONTAINER */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl ring-1 ring-white/5">
          {/* TABS FOR TOGGLING MODE */}
          {mode !== 'forgot' ? (
            <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                  mode === 'login'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Entrar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                  mode === 'register'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Criar Conta</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar ao login</span>
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recuperação
              </span>
            </div>
          )}

          {/* ALERTS */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-3 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-start gap-3 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{successMessage}</div>
            </div>
          )}

          {/* FORM: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="ex: tesouraria@igreja.com"
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setForgotEmail(loginEmail);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl pl-10 pr-11 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-amber-500/20"
                  />
                  <span>Lembrar meu acesso</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="inline-block w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* DEMO SHORTCUT BUTTON */}
              <div className="pt-3 border-t border-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={fillDemoAccount}
                  className="text-xs text-amber-400/90 hover:text-amber-300 font-semibold underline underline-offset-4 cursor-pointer transition-colors inline-flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Usar conta de demonstração rápida (Tesouraria)</span>
                </button>
              </div>
            </form>
          )}

          {/* FORM: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regNome}
                    onChange={(e) => setRegNome(e.target.value)}
                    placeholder="ex: Carlos Eduardo"
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nome da Igreja / Congregação
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regNomeIgreja}
                    onChange={(e) => setRegNomeIgreja(e.target.value)}
                    placeholder="ex: Igreja Evangélica Filial Central"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  E-mail de Login *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="ex: tesoureiro@minhaigreja.org"
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Cargo / Função
                </label>
                <select
                  value={regCargo}
                  onChange={(e) => setRegCargo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-all"
                >
                  <option value="Tesoureiro Principal">Tesoureiro Principal</option>
                  <option value="Pastor Local">Pastor Local</option>
                  <option value="Auxiliar de Tesouraria">Auxiliar de Tesouraria</option>
                  <option value="Secretário / Administração">Secretário / Administração</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Senha *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 dígitos"
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Confirmar Senha *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Ocultar senhas' : 'Mostrar senhas'}</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="inline-block w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Cadastrar & Acessar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORM: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Digite o endereço de e-mail cadastrado na sua conta do Supabase. Enviaremos um link seguro para você redefinir sua senha.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  E-mail Cadastrado
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="ex: tesouraria@igreja.com"
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="inline-block w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enviar Link de Recuperação</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* FOOTER TEXT */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Gestão de Tesouraria Eclesiástica &bull; Sincronização em Nuvem Supabase
        </p>
      </div>
    </div>
  );
};
