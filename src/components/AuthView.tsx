import React, { useState, useEffect } from 'react';
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
  ArrowLeft,
  MessageCircle,
  Headphones,
  Smartphone,
  Download,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { User, ConfigIgreja } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import {
  fetchUserProfile,
  getLocalSupportConfig,
  buildWhatsAppLink,
  formatWhatsAppDisplay,
  isAndroidApkEnvironment,
  fetchGlobalAdminConfig,
  GlobalAdminConfig,
} from '../services/treasuryService';
import { DEMO_USER, DEMO_CONFIG } from '../data/mockData';

interface AuthViewProps {
  onLoginSuccess: (user: User, isNewAccount?: boolean, churchName?: string) => void;
  configIgreja?: ConfigIgreja;
}

interface StoredUserAccount extends User {
  passwordHash: string;
}

function parseSupabaseAuthError(error: { message?: string; status?: number } | null): string {
  if (!error || !error.message) return 'Não foi possível processar sua solicitação no momento. Tente novamente em instantes.';
  
  const msg = error.message.toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'E-mail ou senha incorretos. Verifique suas credenciais ou crie sua conta na aba "Criar Conta".';
  }
  if (msg.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada para confirmar seu acesso antes de entrar.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists') || msg.includes('unique constraint')) {
    return 'Este e-mail já possui cadastro. Clique na aba "Entrar" para acessar sua conta.';
  }
  if (msg.includes('password should be at least') || msg.includes('weak password')) {
    return 'A senha fornecida é muito curta. Crie uma senha com pelo menos 6 caracteres.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('over_email_send_rate_limit')) {
    return 'Muitas tentativas em pouco tempo. Por segurança, aguarde alguns instantes antes de tentar novamente.';
  }
  if (msg.includes('signup disabled') || msg.includes('signups not allowed')) {
    return 'Novos cadastros estão temporariamente indisponíveis no momento.';
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Falha de conexão com os servidores. Verifique sua conexão com a internet.';
  }

  return 'Não foi possível completar a operação no momento. Tente novamente em instantes.';
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
  const [showApkTutorial, setShowApkTutorial] = useState(false);

  // Suporte e Atendimento Global gerenciado pelo Super Admin
  const [globalSupport, setGlobalSupport] = useState<GlobalAdminConfig>(() => getLocalSupportConfig());

  useEffect(() => {
    fetchGlobalAdminConfig().then((data) => {
      if (data) {
        setGlobalSupport(data);
      }
    });
  }, []);

  const supportWhatsApp = globalSupport.whatsappSuporte || configIgreja?.whatsappSuporte || '5511999999999';
  const supportEmail = globalSupport.emailSuporte || configIgreja?.emailSuporte || 'suporte@tesouraria.com';
  const apkDownloadUrl = globalSupport.apkDownloadUrl || configIgreja?.apkDownloadUrl || 'https://drive.google.com';
  const whatsappLink = buildWhatsAppLink(supportWhatsApp, 'Olá, preciso de ajuda e suporte no Sistema de Tesouraria.');

  // Detecção de ambiente: Exibir botão de download apenas na versão Web (ocultar se já estiver rodando dentro do APK)
  const isApkEnvironment = isAndroidApkEnvironment();

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

    if (!isSupabaseConfigured) {
      setErrorMessage('Não foi possível conectar ao sistema no momento. Tente novamente mais tarde.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password: loginPassword,
      });

      if (error) {
        // Informação controlada de login inválido sem gerar exceção não tratada no console
        console.warn('Tentativa de autenticação não autorizada:', error.message);
        setErrorMessage(parseSupabaseAuthError(error));
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        const userProfile = await fetchUserProfile(data.user.id);
        const meta = data.user.user_metadata || {};

        const sessionUser: User = {
          id: data.user.id,
          email: data.user.email || emailTrimmed,
          nome: userProfile?.nome || meta.nome || 'Tesoureiro',
          cargo: userProfile?.cargo || meta.cargo || 'Tesoureiro Principal',
          nomeIgreja: userProfile?.nomeIgreja || meta.nome_igreja || configIgreja?.nomeIgreja || 'Igreja Evangélica',
          subscriptionStatus: userProfile?.subscriptionStatus || 'inactive',
          subscriptionPlan: userProfile?.subscriptionPlan || 'mensal',
          subscriptionExpiresAt: userProfile?.subscriptionExpiresAt,
          mpPreapprovalId: userProfile?.mpPreapprovalId,
          createdAt: data.user.created_at || new Date().toISOString(),
        };

        setSuccessMessage(`Bem-vindo(a) de volta, ${sessionUser.nome}!`);
        setTimeout(() => {
          setIsLoading(false);
          onLoginSuccess(sessionUser, false);
        }, 300);
      }
    } catch (err: unknown) {
      console.error('Erro inesperado no login:', err);
      const errObj = err as { message?: string };
      setErrorMessage(parseSupabaseAuthError(errObj));
      setIsLoading(false);
    }
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

    if (!isSupabaseConfigured) {
      setErrorMessage('Não foi possível conectar ao sistema no momento. Tente novamente mais tarde.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Cria o usuário na autenticação segura
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
        console.error('Erro no cadastro:', error);
        setErrorMessage(parseSupabaseAuthError(error));
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        if (data.user.identities && data.user.identities.length === 0) {
          setErrorMessage('Este e-mail já possui uma conta cadastrada. Faça login para acessar.');
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

        // 2. Salva o perfil
        try {
          const { error: profileErr } = await supabase.from('profiles').upsert({
            id: newUserId,
            user_id: newUserId,
            email: emailTrimmed,
            nome: nomeTrimmed,
            cargo: regCargo || 'Tesoureiro',
            nome_igreja: igrejaTrimmed || 'Minha Igreja',
            created_at: new Date().toISOString(),
          });
          if (profileErr) {
            console.error('Erro ao salvar perfil:', profileErr);
          }
        } catch (profileErr) {
          console.error('Erro inesperado ao salvar perfil:', profileErr);
        }

        // Verifica se requer confirmação de e-mail
        if (!data.session) {
          setSuccessMessage(
            'Conta criada com sucesso! Verifique sua caixa de entrada caso a confirmação por e-mail esteja ativada.'
          );
        } else {
          setSuccessMessage('Conta criada com sucesso!');
        }

        setTimeout(() => {
          setIsLoading(false);
          onLoginSuccess(newUser, true, newUser.nomeIgreja);
        }, 500);
      }
    } catch (err: unknown) {
      console.error('Erro inesperado no registro:', err);
      const errObj = err as { message?: string };
      setErrorMessage(parseSupabaseAuthError(errObj));
      setIsLoading(false);
    }
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
          console.error('Erro Supabase na recuperação de senha:', error);
          setErrorMessage(parseSupabaseAuthError(error));
        } else {
          setSuccessMessage(
            'Link de recuperação de senha enviado com sucesso! Verifique sua caixa de entrada e pasta de spam.'
          );
        }
        return;
      } catch (err: unknown) {
        setIsLoading(false);
        console.error('Erro Supabase inesperado na recuperação de senha:', err);
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

  const handleAccessDemo = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage('Acessando Modo Demonstração (Sem Cadastro)...');
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(DEMO_USER, false, DEMO_CONFIG.nomeIgreja);
    }, 200);
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

          {/* Status Indicator */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acesso Seguro e Criptografado</span>
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
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex flex-col gap-2.5 animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-snug">{errorMessage}</div>
              </div>
              {mode === 'login' && errorMessage.includes('E-mail ou senha') && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-500/20 pl-8">
                  <button
                    type="button"
                    onClick={() => {
                      setRegEmail(loginEmail);
                      setMode('register');
                      setErrorMessage(null);
                    }}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                  >
                    Criar conta com este e-mail &rarr;
                  </button>
                  <span className="text-rose-400/40 text-xs">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(loginEmail);
                      setMode('forgot');
                      setErrorMessage(null);
                    }}
                    className="text-xs text-slate-300 hover:text-white hover:underline cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}
              {mode === 'register' && errorMessage.includes('já possui cadastro') && (
                <div className="pt-1 border-t border-rose-500/20 pl-8">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail(regEmail);
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                  >
                    Entrar na minha conta existente &rarr;
                  </button>
                </div>
              )}
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

              {/* BOTAO DE ACESSO DIRETO A CONTA DEMO */}
              <div className="pt-4 border-t border-slate-800/80 space-y-2">
                <button
                  type="button"
                  onClick={handleAccessDemo}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/25 to-amber-500/15 hover:from-amber-500/25 hover:to-amber-500/35 text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-500/70 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Acessar Conta Demo (Modo Demonstração)</span>
                </button>
                <p className="text-[11px] text-slate-400 text-center leading-tight">
                  Acesso direto instantâneo sem necessidade de e-mail, senha ou cadastro prévio.
                </p>
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

              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={handleAccessDemo}
                  className="text-xs text-amber-400/90 hover:text-amber-300 font-semibold underline underline-offset-4 cursor-pointer transition-colors inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Deseja testar sem cadastrar? Acessar Conta Demo</span>
                </button>
              </div>
            </form>
          )}

          {/* FORM: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Digite o endereço de e-mail cadastrado na sua conta. Enviaremos um link seguro para você redefinir sua senha.
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

          {/* SEÇÃO: DOWNLOAD DO APLICATIVO ANDROID (APK) - EXCLUSIVO PARA VERSÃO WEB */}
          {!isApkEnvironment && (
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-4 text-center shadow-lg relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-emerald-300">
                    Versão Mobile Disponível
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 mb-3">
                  Instale o aplicativo oficial diretamente no seu celular Android para maior comodidade.
                </p>

                <a
                  href={apkDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Baixar Aplicativo Android (APK)</span>
                </a>

                {/* BOTÃO E TUTORIAL PASSO A PASSO (EXCLUSIVO WEB) */}
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => setShowApkTutorial(!showApkTutorial)}
                    className="inline-flex items-center justify-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium cursor-pointer py-1 px-2 rounded-lg hover:bg-emerald-500/10"
                  >
                    <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Como instalar o APK no seu celular? (Passo a Passo)</span>
                    {showApkTutorial ? (
                      <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>
                </div>

                {showApkTutorial && (
                  <div className="mt-3 text-left p-3.5 bg-slate-900/95 border border-emerald-500/30 rounded-xl text-xs space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                        Instruções de Instalação no Android
                      </span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-semibold">
                        Simples e Rápido
                      </span>
                    </div>

                    {/* Passo 1 */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                        1
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200 block text-xs">Passo 1: Fazer o Download</span>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          Clique em <strong className="text-emerald-300">"Baixar Aplicativo"</strong> para fazer o download do arquivo <code className="text-emerald-300 font-mono">.apk</code> no Google Drive.
                        </p>
                      </div>
                    </div>

                    {/* Passo 2 */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                        2
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200 block text-xs">Passo 2: Aviso de Segurança</span>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          Ao abrir o arquivo baixado, seu celular exibirá o aviso <strong className="text-slate-200">"Instalar aplicativos desconhecidos"</strong>.
                        </p>
                      </div>
                    </div>

                    {/* Passo 3 */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                        3
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200 block text-xs">Passo 3: Permitir e Instalar</span>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          Clique em <strong className="text-slate-200">"Configurações"</strong> no aviso, ative a opção <strong className="text-emerald-300">"Permitir desta fonte"</strong> e confirme a instalação.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEÇÃO DE SUPORTE E ATENDIMENTO */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-amber-400" />
                <span>Precisa de ajuda ou suporte?</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Fale com nossa equipe técnica para tirar dúvidas ou solicitar atendimento:
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
              {/* Botão do WhatsApp */}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>WhatsApp: {formatWhatsAppDisplay(supportWhatsApp)}</span>
              </a>

              {/* Link de E-mail */}
              <a
                href={`mailto:${supportEmail}?subject=${encodeURIComponent('Suporte - Sistema de Tesouraria')}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{supportEmail}</span>
              </a>
            </div>
          </div>
        </div>

        {/* FOOTER TEXT */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Gestão de Tesouraria Eclesiástica &bull; Sincronização em Nuvem Segura
        </p>
      </div>
    </div>
  );
};
