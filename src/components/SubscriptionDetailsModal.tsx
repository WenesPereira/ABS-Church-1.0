import React, { useState } from 'react';
import {
  Crown,
  CheckCircle2,
  Check,
  Calendar,
  User as UserIcon,
  CreditCard,
  X,
  Sparkles,
  Cloud,
  Printer,
  FileCheck,
  Zap,
  ShieldCheck,
  Copy,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { User } from '../types';
import { isSuperAdmin, isSubscriptionActive } from '../services/treasuryService';

interface SubscriptionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onRenew?: () => void; // Ação para abrir a tela de renovação / Mercado Pago PIX
  onStatusUpdated?: (updatedUser: User) => void;
}

export const SubscriptionDetailsModal: React.FC<SubscriptionDetailsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRenew,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isSuper = isSuperAdmin(currentUser);
  const isSubscribed = isSubscriptionActive(currentUser);

  // Formatação segura da data de vencimento (subscription_expires_at)
  const formatExpirationDate = (): string => {
    if (isSuper) {
      return 'Vitalício / Isento';
    }

    const rawExpires = currentUser?.subscriptionExpiresAt;
    if (rawExpires && rawExpires.trim()) {
      const trimmed = rawExpires.trim();
      if (trimmed.toLowerCase().includes('vitalício') || trimmed.toLowerCase().includes('isento')) {
        return trimmed;
      }
      const parsed = new Date(trimmed.includes('T') ? trimmed : `${trimmed}T23:59:59`);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }
      return trimmed;
    }

    // Se tiver data de criação e não tiver vencimento, 30 dias após criação
    if (currentUser?.createdAt) {
      const created = new Date(currentUser.createdAt);
      if (!Number.isNaN(created.getTime())) {
        const nextMonth = new Date(created);
        nextMonth.setDate(nextMonth.getDate() + 30);
        return nextMonth.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }
    }

    // Fallback: 30 dias a partir da data atual
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + 30);
    return fallbackDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleCopyId = () => {
    if (currentUser?.id) {
      navigator.clipboard.writeText(currentUser.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeBenefits = [
    {
      icon: Cloud,
      title: 'Backup Nuvem & Sincronização',
      desc: 'Isolamento de dados e acesso seguro em múltiplos dispositivos.',
    },
    {
      icon: FileCheck,
      title: 'Atas e Cultos Ilimitados',
      desc: 'Sem limite de lançamentos ou histórico financeiro.',
    },
    {
      icon: Printer,
      title: 'Impressão Térmica e PDF Oficial',
      desc: 'Atas timbradas e recibos de dízimos para impressoras de 58/80mm.',
    },
    {
      icon: Sparkles,
      title: 'Relatórios Inteligentes com IA',
      desc: 'Auditoria de caixa e parecer automático com Inteligência Artificial.',
    },
    {
      icon: Zap,
      title: 'Repasse à Matriz & Prebenda',
      desc: 'Cálculo automatizado bruto ou líquido conforme o estatuto.',
    },
    {
      icon: ShieldCheck,
      title: 'Suporte Prioritário Dedicado',
      desc: 'Atendimento via WhatsApp e garantia de novas atualizações.',
    },
  ];

  return (
    <div
      id="subscription-details-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="subscription-details-modal-card"
        className="relative w-full max-w-2xl bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl shadow-emerald-500/10 overflow-hidden my-6"
      >
        {/* ===================================================
            1. CABEÇALHO DA MODAL
            =================================================== */}
        <div className="relative bg-gradient-to-r from-emerald-950/70 via-slate-900 to-amber-950/40 p-6 sm:p-7 border-b border-slate-800">
          <button
            id="btn-close-subscription-details"
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer border border-slate-700/50"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/25 shrink-0">
              <Crown className="w-6 h-6 fill-current" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  ATIVO
                </span>
                {isSuper && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                    SUPER ADMIN
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                Detalhes da Assinatura Pro
              </h2>
            </div>
          </div>
        </div>

        {/* ===================================================
            2. CORPO DA MODAL
            =================================================== */}
        <div className="p-6 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* CARD DE INFORMAÇÕES PRINCIPAIS */}
          <div
            id="subscription-main-info-card"
            className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/30 space-y-4 shadow-inner"
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Dados do Plano
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                {isSuper ? 'Isento / Vitalício' : 'Recorrência Mensal'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* PLANO */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Plano Contratado
                </span>
                <span className="text-sm font-extrabold text-slate-100 block">
                  PRO Mensal
                </span>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  {isSuper ? 'R$ 0,00 (Isento)' : 'R$ 19,90/mês'}
                </span>
              </div>

              {/* DATA DE VENCIMENTO */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Data de Vencimento
                </span>
                <span className="text-sm font-extrabold text-emerald-400 font-mono block">
                  {formatExpirationDate()}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isSuper ? 'Acesso Permanente' : 'Próxima Renovação'}
                </span>
              </div>

              {/* ID DO ASSINANTE */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1 flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-slate-400" />
                    ID do Assinante
                  </span>
                  <span
                    className="font-mono text-xs text-slate-300 font-semibold truncate block"
                    title={currentUser?.id || 'Não identificado'}
                  >
                    {currentUser?.id
                      ? `${currentUser.id.substring(0, 10)}...${currentUser.id.substring(currentUser.id.length - 4)}`
                      : 'Não identificado'}
                  </span>
                </div>

                {currentUser?.id && (
                  <button
                    id="btn-copy-subscriber-id"
                    type="button"
                    onClick={handleCopyId}
                    className="mt-2 text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? 'ID Copiado!' : 'Copiar ID'}</span>
                  </button>
                )}
              </div>
            </div>

            {currentUser?.email && (
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span>E-mail vinculado:</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {currentUser.email}
                </span>
              </div>
            )}
          </div>

          {/* LISTA DE BENEFÍCIOS ATIVOS */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Recursos e Benefícios Inclusos no Plano:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeBenefits.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-100 truncate">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===================================================
              3. BOTÕES DE AÇÃO
              =================================================== */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* BOTÃO RENOVAR ASSINATURA / GERAR PIX */}
            <button
              id="btn-renew-subscription-pix"
              type="button"
              onClick={() => {
                if (onRenew) {
                  onRenew();
                } else {
                  onClose();
                }
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Renovar Assinatura / Gerar PIX</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* BOTÃO FECHAR */}
            <button
              id="btn-close-subscription-details-footer"
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs border border-slate-700 hover:border-slate-600 transition-all active:scale-95 cursor-pointer text-center"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
