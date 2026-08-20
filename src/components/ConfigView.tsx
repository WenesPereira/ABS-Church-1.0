import React, { useState, useEffect } from 'react';
import {
  Settings,
  Church,
  Check,
  User as UserIcon,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Crown,
  Sparkles,
  RefreshCw,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  MessageCircle,
  Mail,
  Headphones,
  Smartphone,
  Download,
  ExternalLink,
  Save,
  Globe,
} from 'lucide-react';
import { ConfigIgreja, CategoriaEntrada, ActiveTab, User } from '../types';
import { ALL_ENTRADA_CATEGORIES, CATEGORIA_ENTRADA_LABELS } from '../utils/calculations';
import {
  isSubscriptionActive,
  fetchUserProfile,
  DEFAULT_CONFIG,
  isSuperAdmin,
  fetchGlobalAdminConfig,
  saveGlobalAdminConfig,
  GlobalAdminConfig,
  getLocalSupportConfig,
} from '../services/treasuryService';

interface ConfigViewProps {
  config: ConfigIgreja;
  setConfig: React.Dispatch<React.SetStateAction<ConfigIgreja>>;
  onNavigate?: (tab: ActiveTab) => void;
  currentUser?: User | null;
  onOpenSubscriptionModal?: () => void;
  onStatusUpdated?: (updatedUser: User) => void;
  onResetAllData?: () => Promise<boolean>;
}

export const ConfigView: React.FC<ConfigViewProps> = ({
  config,
  setConfig,
  onNavigate,
  currentUser,
  onOpenSubscriptionModal,
  onStatusUpdated,
  onResetAllData,
}) => {
  const [form, setForm] = useState<ConfigIgreja>(config);
  const [saved, setSaved] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  // Estados do Modal de Confirmação Dupla de Reset/Exclusão
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados exclusivos do Super Admin Global (wenes13@hotmail.com)
  const isSuper = isSuperAdmin(currentUser);
  const [globalConfig, setGlobalConfig] = useState<GlobalAdminConfig>(() => getLocalSupportConfig());
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);
  const [globalSavedFeedback, setGlobalSavedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isSuper) {
      fetchGlobalAdminConfig().then((data) => {
        if (data) {
          setGlobalConfig(data);
        }
      });
    }
  }, [isSuper]);

  const isSubscribed = isSubscriptionActive(currentUser);

  const handleRefreshSubscription = async () => {
    if (!currentUser?.id) return;
    setIsVerifying(true);
    setVerifyMessage(null);
    try {
      const fresh = await fetchUserProfile(currentUser.id);
      if (fresh) {
        if (onStatusUpdated) onStatusUpdated(fresh);
        if (isSubscriptionActive(fresh)) {
          setVerifyMessage('Status atualizado: Assinatura PRO Ativa!');
        } else {
          setVerifyMessage('Status atualizado: Assinatura ainda não detectada.');
        }
      }
    } catch (e) {
      console.error(e);
      setVerifyMessage('Não foi possível verificar a assinatura no momento.');
    } finally {
      setIsVerifying(false);
      setTimeout(() => setVerifyMessage(null), 4000);
    }
  };

  const handleToggleCategoriaDefault = (cat: CategoriaEntrada) => {
    const current = form.categoriasRepasseMatriz || ALL_ENTRADA_CATEGORIES;
    let updated: CategoriaEntrada[];
    if (current.includes(cat)) {
      updated = current.filter((c) => c !== cat);
    } else {
      updated = [...current, cat];
    }
    const isAll = updated.length === ALL_ENTRADA_CATEGORIES.length;
    setForm({
      ...form,
      categoriasRepasseMatriz: updated,
      tipoBaseRepasseMatriz: isAll ? 'todas' : 'selecionadas',
    });
  };

  const handleSelectTodaEntradaDefault = () => {
    setForm({
      ...form,
      tipoBaseRepasseMatriz: 'todas',
      categoriasRepasseMatriz: ALL_ENTRADA_CATEGORIES,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSaveGlobalAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGlobal(true);
    setGlobalSavedFeedback(null);
    try {
      const ok = await saveGlobalAdminConfig(globalConfig);
      if (ok) {
        setGlobalSavedFeedback('Configurações globais salvas com sucesso no banco Supabase!');
      } else {
        setGlobalSavedFeedback('Configurações salvas localmente.');
      }
    } catch (err) {
      console.error(err);
      setGlobalSavedFeedback('Erro ao salvar configurações globais.');
    } finally {
      setIsSavingGlobal(false);
      setTimeout(() => setGlobalSavedFeedback(null), 4000);
    }
  };

  const handleOpenResetModal = () => {
    setConfirmInput('');
    setResetFeedback(null);
    setIsResetModalOpen(true);
  };

  const handleExecuteReset = async () => {
    if (confirmInput.trim().toUpperCase() !== 'CONFIRMAR') {
      return;
    }

    setIsResetting(true);
    setResetFeedback(null);

    try {
      if (onResetAllData) {
        const ok = await onResetAllData();
        if (ok) {
          setForm(DEFAULT_CONFIG);
          setResetFeedback({
            type: 'success',
            message: 'Todos os dados foram excluídos e o sistema foi restaurado para o padrão com sucesso.',
          });
          setTimeout(() => {
            setIsResetModalOpen(false);
            setConfirmInput('');
            setIsResetting(false);
          }, 1800);
          return;
        }
      }

      setResetFeedback({
        type: 'error',
        message: 'Não foi possível concluir a limpeza dos dados. Tente novamente em instantes.',
      });
    } catch (err) {
      console.error('Erro ao resetar dados:', err);
      setResetFeedback({
        type: 'error',
        message: 'Ocorreu um erro inesperado ao tentar resetar os dados.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div id="config-view-container" className="space-y-6 w-full max-w-4xl mx-auto pb-12">
      {/* Barra de Navegação Contextual */}
      {onNavigate && (
        <div className="flex items-center justify-between gap-3 w-full">
          <button
            type="button"
            onClick={() => onNavigate('fechamento')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Voltar ao Fechamento Atual</span>
          </button>
        </div>
      )}

      {/* CARD 0: PLANO & ASSINATURA MERCADO PAGO */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isSubscribed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              <Crown className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  Plano & Assinatura Mensal
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  isSuper
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : isSubscribed
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {isSuper ? 'Super Admin (Isento)' : isSubscribed ? 'Pro Ativo' : 'Plano Gratuito'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isSuper
                  ? 'Conta de Super Administrador com liberação total e isenção permanente de assinatura.'
                  : isSubscribed
                  ? 'Sua igreja tem acesso total aos recursos de IA, impressão térmica e nuvem.'
                  : 'Assine para liberar relatórios com IA, fechamentos ilimitados e suporte.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSubscriptionModal && (
              <button
                type="button"
                onClick={onOpenSubscriptionModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5 fill-current" />
                <span>{isSubscribed ? 'Ver Detalhes do Plano' : 'Assinar Plano Pro'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRefreshSubscription}
              disabled={isVerifying}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Atualizar status da assinatura"
            >
              <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {verifyMessage && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{verifyMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase text-slate-500 font-bold block">Status Atual</span>
            <span className={`font-mono font-bold ${isSuper ? 'text-purple-300' : isSubscribed ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isSuper ? 'ATIVO (ISENTO / SUPER ADMIN)' : isSubscribed ? 'ATIVO (PRO)' : 'INATIVO / BÁSICO'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase text-slate-500 font-bold block">Cobrança Mensal</span>
            <span className="font-mono font-bold text-slate-200">
              {isSuper ? 'Isento (Sem cobrança)' : 'R$ 19,90 / mês'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase text-slate-500 font-bold block">Identificador do Usuário</span>
            <span className="font-mono text-[11px] text-slate-400 truncate block" title={currentUser?.id}>
              {currentUser?.id ? `${currentUser.id.substring(0, 14)}...` : 'Não identificado'}
            </span>
          </div>
        </div>
      </div>

      {/* PAINEL EXCLUSIVO DO SUPER ADMINISTRADOR (Visível apenas para wenes13@hotmail.com) */}
      {isSuper && (
        <div className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border-2 border-purple-500/60 rounded-3xl p-5 md:p-6 shadow-2xl w-full space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-purple-100">
                    Painel do Administrador (Global)
                  </h2>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-purple-500 text-white tracking-wide shadow-sm">
                    SUPER ADMIN
                  </span>
                </div>
                <p className="text-xs text-purple-300/80 mt-0.5">
                  Gerenciamento global de canais de suporte e link de download do aplicativo Android (APK).
                </p>
              </div>
            </div>
            <div className="text-right text-[11px] text-purple-300/70 font-mono">
              Acesso exclusivo: <span className="text-purple-200 font-bold">{currentUser?.email}</span>
            </div>
          </div>

          {globalSavedFeedback && (
            <div className="bg-purple-950/80 border border-purple-500/60 p-4 rounded-2xl text-xs text-purple-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="font-semibold">{globalSavedFeedback}</span>
            </div>
          )}

          <form onSubmit={handleSaveGlobalAdmin} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp de Suporte (Global):</span>
                </label>
                <input
                  type="text"
                  value={globalConfig.whatsappSuporte || ''}
                  onChange={(e) => setGlobalConfig({ ...globalConfig, whatsappSuporte: e.target.value })}
                  placeholder="Ex: 5511999999999 ou (11) 99999-9999"
                  className="w-full bg-slate-950 border border-purple-500/30 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Usado no botão de WhatsApp da tela de login e suporte.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>E-mail de Suporte (Global):</span>
                </label>
                <input
                  type="email"
                  value={globalConfig.emailSuporte || ''}
                  onChange={(e) => setGlobalConfig({ ...globalConfig, emailSuporte: e.target.value })}
                  placeholder="Ex: suporte@tesouraria.com"
                  className="w-full bg-slate-950 border border-purple-500/30 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Usado no botão de envio de e-mail na tela de login.
                </span>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Link para Download do Aplicativo Android (.APK):</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={globalConfig.apkDownloadUrl || ''}
                  onChange={(e) => setGlobalConfig({ ...globalConfig, apkDownloadUrl: e.target.value })}
                  placeholder="Ex: https://drive.google.com/file/d/... ou https://onedrive.live.com/..."
                  className="flex-1 bg-slate-950 border border-purple-500/30 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                {globalConfig.apkDownloadUrl && (
                  <a
                    href={globalConfig.apkDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs font-bold transition-colors border border-purple-500/40 shrink-0"
                    title="Testar link de download"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Testar Link</span>
                  </a>
                )}
              </div>
              <p className="text-[10px] text-purple-300/70 mt-1">
                Link público direto para o APK (OneDrive, MediaFire, Google Drive, etc.). Esse link é aberto quando os usuários clicam em "Baixar Aplicativo Android (APK)" na tela de login da Web.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSavingGlobal}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-3 rounded-2xl font-bold text-xs transition-all shadow-lg shadow-purple-600/30 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSavingGlobal ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando no Supabase...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Configurações Globais</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* CARD 1: CONFIGURAÇÕES DA IGREJA */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl w-full space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Configurações Gerais da Igreja</h2>
            <p className="text-xs text-slate-400">
              Informações institucionais exibidas nas atas, comprovantes impressos e relatórios de tesouraria.
            </p>
          </div>
        </div>

        {saved && (
          <div className="bg-emerald-950/50 border border-emerald-500/50 p-4 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Configurações salvas com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Oficial da Igreja:</label>
              <input
                type="text"
                value={form.nomeIgreja}
                onChange={(e) => setForm({ ...form, nomeIgreja: e.target.value })}
                placeholder="Ex: Igreja Evangélica Assembleia de Deus"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">CNPJ da Igreja (Opcional):</label>
              <input
                type="text"
                value={form.cnpj || ''}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cidade e UF:</label>
              <input
                type="text"
                value={form.cidadeUF || ''}
                onChange={(e) => setForm({ ...form, cidadeUF: e.target.value })}
                placeholder="Ex: São Paulo - SP"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pastor Presidente:</label>
              <input
                type="text"
                value={form.pastorPresidente}
                onChange={(e) => setForm({ ...form, pastorPresidente: e.target.value })}
                placeholder="Ex: Pastor Carlos Silva"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pastor Local:</label>
              <input
                type="text"
                value={form.pastorLocal || ''}
                onChange={(e) => setForm({ ...form, pastorLocal: e.target.value })}
                placeholder="Ex: Pastor Roberto Santos"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tesoureiro Padrão:</label>
              <input
                type="text"
                value={form.tesoureiroPadrao}
                onChange={(e) => setForm({ ...form, tesoureiroPadrao: e.target.value })}
                placeholder="Ex: Diácono Marcos"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">2º Tesoureiro / Conferente:</label>
              <input
                type="text"
                value={form.segundoTesoureiroPadrao || ''}
                onChange={(e) => setForm({ ...form, segundoTesoureiroPadrao: e.target.value })}
                placeholder="Ex: Obreiro João"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Porcentagem de Repasse para Matriz / Sede (%):</span>
                <span className="text-[10px] text-amber-400 font-bold">Calculado sobre Entradas</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.porcentagemMatriz ?? 20}
                  onChange={(e) => setForm({ ...form, porcentagemMatriz: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 20"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 pr-8 text-xs font-bold font-mono text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>

            <div className="md:col-span-2 pt-2 border-t border-slate-800/80 space-y-3">
              <label className="flex items-center gap-3 text-xs text-slate-200 cursor-pointer bg-slate-950 p-3 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={form.aplicarRepasseMatriz ?? true}
                  onChange={(e) => setForm({ ...form, aplicarRepasseMatriz: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <span className="font-bold text-slate-100 block">Aplicar Repasse para a Matriz / Sede por Padrão</span>
                  <span className="text-[11px] text-slate-400 block">Habilita o desconto automático da porcentagem da matriz nos relatórios de fechamento.</span>
                </div>
              </label>

              {(form.aplicarRepasseMatriz ?? true) && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      Categorias de Entrada Padrão para Cálculo do Repasse:
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectTodaEntradaDefault}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        (form.tipoBaseRepasseMatriz || 'todas') === 'todas'
                          ? 'bg-purple-600 text-white border-purple-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      ★ Selecionar Toda a Entrada
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {ALL_ENTRADA_CATEGORIES.map((cat) => {
                      const isSel = (form.tipoBaseRepasseMatriz || 'todas') === 'todas' || (form.categoriasRepasseMatriz || ALL_ENTRADA_CATEGORIES).includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleToggleCategoriaDefault(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-purple-950 text-purple-200 border-purple-500'
                              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                          }`}
                        >
                          {isSel ? '✓' : '○'} {CATEGORIA_ENTRADA_LABELS[cat]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 py-3 rounded-2xl font-bold text-xs transition-all shadow-lg shadow-amber-600/20 cursor-pointer"
          >
            Salvar Dados da Igreja
          </button>
        </form>
      </div>

      {/* CARD 3: ZONA DE PERIGO - EXCLUIR & RESETAR DADOS */}
      <div className="bg-slate-900/90 border border-rose-900/40 rounded-3xl p-5 md:p-6 shadow-xl w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-900/30 pb-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-rose-200">
                  Zona de Perigo: Excluir e Resetar Dados
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Ação Destrutiva
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Apaga permanentemente todos os fechamentos, lançamentos de dízimos/ofertas e restaura as configurações padrões do sistema.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenResetModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs transition-all shadow-lg shadow-rose-900/30 cursor-pointer shrink-0 active:scale-95"
            title="Abrir confirmação para excluir e resetar todos os dados"
          >
            <Trash2 className="w-4 h-4 text-white" />
            <span>Excluir / Resetar Dados</span>
          </button>
        </div>

        <div className="bg-rose-950/20 border border-rose-900/30 rounded-2xl p-4 text-xs text-rose-300/90 space-y-1">
          <p className="font-semibold flex items-center gap-1.5 text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            Atenção antes de prosseguir:
          </p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Esta operação removerá todas as atas de culto, balancetes, contagens de cédulas e histórico financeiro associados à sua conta. Recomendamos emitir e salvar os relatórios em PDF antes de executar o reset.
          </p>
        </div>
      </div>

      {/* =========================================================
          MODAL DE CONFIRMAÇÃO DUPLA (RESET / EXCLUSÃO DE DADOS)
          ========================================================= */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-left">
            {/* Botão Fechar */}
            <button
              type="button"
              onClick={() => {
                if (!isResetting) {
                  setIsResetModalOpen(false);
                  setConfirmInput('');
                }
              }}
              disabled={isResetting}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho do Alerta */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Confirmação Obrigatória
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">
                  Excluir Todos os Dados da Igreja
                </h3>
              </div>
            </div>

            {/* Mensagem Exata Requisitada */}
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/50 space-y-2">
              <p className="text-sm font-bold text-rose-200 leading-snug">
                Tem certeza de que deseja apagar todos os seus dados? Esta ação é irreversível.
              </p>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside pt-1">
                <li>Todos os fechamentos e atas de culto serão excluídos</li>
                <li>Todos os lançamentos de dízimos, ofertas e despesas serão apagados</li>
                <li>As configurações da igreja serão restauradas para os padrões</li>
              </ul>
            </div>

            {/* Feedback de sucesso ou erro */}
            {resetFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  resetFeedback.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}
              >
                {resetFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{resetFeedback.message}</span>
              </div>
            )}

            {/* Campo de Confirmação Textual Obrigatória */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Para confirmar a exclusão, digite <span className="font-mono text-rose-400 font-bold">CONFIRMAR</span> no campo abaixo:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Digite CONFIRMAR"
                disabled={isResetting}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl p-3 text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetModalOpen(false);
                  setConfirmInput('');
                }}
                disabled={isResetting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={confirmInput.trim().toUpperCase() !== 'CONFIRMAR' || isResetting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs transition-all shadow-lg shadow-rose-900/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Excluindo dados...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Sim, desejo apagar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
