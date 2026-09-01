import React from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  MessageCircle,
  Calendar,
  Check,
  X,
  Zap,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const APP_VERSION = '1.2.0';
export const APP_VERSION_STORAGE_KEY = 'eklesia_app_version';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleUnderstood = () => {
    localStorage.setItem(APP_VERSION_STORAGE_KEY, APP_VERSION);
    onClose();
  };

  const highlights = [
    {
      icon: ImageIcon,
      iconColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      title: 'Recibos em Imagem (PNG)',
      badge: 'Novo',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description:
        'Agora os comprovantes são gerados instantaneamente como imagem de alta resolução (PNG) direto no dispositivo para salvar na galeria ou fotos.',
    },
    {
      icon: MessageCircle,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      title: 'WhatsApp mais Limpo',
      badge: 'Otimizado',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description:
        'Envio de confirmação direto com formatação textual elegante e sem links ou URLs de servidor expostas na mensagem.',
    },
    {
      icon: Calendar,
      iconColor: 'text-sky-400',
      bgColor: 'bg-sky-500/10 border-sky-500/20',
      title: 'Histórico Organizado & Datas BR',
      badge: 'Ajustado',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      description:
        'Lista de recibos organizada em ordem cronológica decrescente (mais recentes primeiro) e datas no padrão brasileiro (DD/MM/AAAA).',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Glow Decorativo de Fundo */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Botão Fechar X */}
        <button
          onClick={handleUnderstood}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Topo / Cabeçalho */}
        <div className="text-center space-y-2 pt-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono text-amber-400">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Versão {APP_VERSION}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Novidades no Módulo Financeiro
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
              Confira as melhorias e novos recursos adicionados para tornar sua gestão mais rápida e elegante.
            </p>
          </div>
        </div>

        {/* Lista de Tópicos das Novidades */}
        <div className="space-y-3 pt-1">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex items-start gap-3.5"
              >
                <div
                  className={`p-2.5 rounded-xl border shrink-0 ${item.bgColor} ${item.iconColor}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-white truncate">
                      {item.title}
                    </h4>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border shrink-0 ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé de Informação e Botão Principal */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Seus dados continuam sincronizados com segurança.</span>
          </div>

          <button
            type="button"
            onClick={handleUnderstood}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <span>Entendido, continuar para o App</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
