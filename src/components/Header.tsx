import React from 'react';

import {
  Church,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  RefreshCw,
  Download,
} from 'lucide-react';

import {
  ActiveTab,
  FechamentoCulto,
  ConfigIgreja,
} from '../types';

import {
  formatCurrency,
  calcularResumoLancamentos,
} from '../utils/calculations';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  fechamentoAtual: FechamentoCulto;
  configIgreja: ConfigIgreja;
  onNovoFechamento: () => void;
  onOpenPrintModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  fechamentoAtual,
  configIgreja,
  onNovoFechamento,
  onOpenPrintModal,
}) => {
  const resumo =
    calcularResumoLancamentos(
      fechamentoAtual.lancamentos
    );

  return (
    <header
      className="
        w-full
        flex
        flex-col
        md:flex-row
        md:items-center
        md:justify-between
        gap-3
        bg-slate-900
        border-b
        border-slate-800
        text-slate-100
        px-4
        lg:px-8
        py-3
        shadow-xl
      "
    >

      {/* =====================================================
          IDENTIFICAÇÃO DA IGREJA
          ===================================================== */}

      <div
        className="
          flex
          items-center
          gap-3
          min-w-0
        "
      >

        <button
          type="button"
          onClick={() =>
            setActiveTab('fechamento')
          }
          className="
            w-10
            h-10
            shrink-0
            rounded-2xl
            bg-gradient-to-br
            from-amber-500
            via-amber-600
            to-amber-700
            flex
            items-center
            justify-center
            text-slate-950
            font-bold
            shadow-lg
            shadow-amber-500/20
            ring-1
            ring-white/20
            cursor-pointer
            touch-manipulation
          "
          aria-label="Ir para fechamento de caixa"
        >
          <Church
            className="
              w-5
              h-5
              text-slate-950
            "
          />
        </button>

        <div
          className="
            min-w-0
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
              min-w-0
            "
          >

            <h1
              className="
                font-bold
                text-base
                md:text-lg
                text-white
                tracking-tight
                leading-none
                truncate
              "
            >
              {configIgreja.nomeIgreja ||
                'Tesouraria da Igreja'}
            </h1>

            <span
              className={`
                shrink-0
                text-[10px]
                px-2
                py-0.5
                rounded-full
                font-semibold
                uppercase
                tracking-wider
                ${
                  fechamentoAtual.status === 'fechado'
                    ? `
                      bg-emerald-500/20
                      text-emerald-300
                      border
                      border-emerald-500/30
                    `
                    : `
                      bg-amber-500/20
                      text-amber-300
                      border
                      border-amber-500/30
                    `
                }
              `}
            >
              {fechamentoAtual.status === 'fechado'
                ? 'Caixa Encerrado'
                : 'Caixa em Aberto'}
            </span>

          </div>

          <p
            className="
              text-xs
              text-slate-400
              mt-1
              flex
              items-center
              gap-1.5
              flex-wrap
            "
          >
            <span
              className="
                font-semibold
                text-slate-300
              "
            >
              Caixa Tesouraria
            </span>

            <span>•</span>

            <span>
              Data Automática:{' '}

              {fechamentoAtual.data
                ? new Date(
                    fechamentoAtual.data +
                      'T00:00:00'
                  ).toLocaleDateString(
                    'pt-BR'
                  )
                : new Date().toLocaleDateString(
                    'pt-BR'
                  )}
            </span>
          </p>

        </div>
      </div>

      {/* =====================================================
          TOTAIS - DESKTOP
          ===================================================== */}

      <div
        className="
          hidden
          lg:flex
          items-center
          gap-6
          bg-slate-950/80
          px-4
          py-2
          rounded-2xl
          border
          border-slate-800/80
          text-xs
        "
      >

        {/* ENTRADAS */}

        <div
          className="
            flex
            items-center
            gap-2
          "
        >

          <div
            className="
              p-1.5
              rounded-lg
              bg-emerald-500/10
              text-emerald-400
            "
          >
            <ArrowUpRight
              className="w-4 h-4"
            />
          </div>

          <div>
            <span
              className="
                text-[10px]
                uppercase
                text-slate-500
                font-semibold
                block
              "
            >
              Entradas
            </span>

            <span
              className="
                font-bold
                font-mono
                text-emerald-400
                text-sm
              "
            >
              {formatCurrency(
                resumo.totalEntradas
              )}
            </span>
          </div>

        </div>

        <div
          className="
            w-[1px]
            h-6
            bg-slate-800
          "
        />

        {/* SAÍDAS */}

        <div
          className="
            flex
            items-center
            gap-2
          "
        >

          <div
            className="
              p-1.5
              rounded-lg
              bg-rose-500/10
              text-rose-400
            "
          >
            <ArrowDownRight
              className="w-4 h-4"
            />
          </div>

          <div>

            <span
              className="
                text-[10px]
                uppercase
                text-slate-500
                font-semibold
                block
              "
            >
              Saídas
            </span>

            <span
              className="
                font-bold
                font-mono
                text-rose-400
                text-sm
              "
            >
              {formatCurrency(
                resumo.totalSaidas
              )}
            </span>

          </div>
        </div>

        <div
          className="
            w-[1px]
            h-6
            bg-slate-800
          "
        />

        {/* SALDO */}

        <div
          className="
            flex
            items-center
            gap-2
          "
        >

          <div
            className="
              p-1.5
              rounded-lg
              bg-amber-500/10
              text-amber-400
            "
          >
            <DollarSign
              className="w-4 h-4"
            />
          </div>

          <div>

            <span
              className="
                text-[10px]
                uppercase
                text-slate-500
                font-semibold
                block
              "
            >
              Saldo Líquido
            </span>

            <span
              className="
                font-bold
                font-mono
                text-amber-300
                text-sm
              "
            >
              {formatCurrency(
                resumo.saldoLiquido
              )}
            </span>

          </div>
        </div>

      </div>

      {/* =====================================================
          BOTÕES
          ===================================================== */}

      <div
        className="
          flex
          items-center
          gap-2
          self-end
          md:self-auto
          shrink-0
        "
      >

        {/* IMPRIMIR */}

        <button
          type="button"
          onClick={onOpenPrintModal}
          className="
            flex
            items-center
            gap-1.5
            px-3
            py-2
            rounded-xl
            bg-slate-800
            hover:bg-slate-700
            text-slate-200
            text-xs
            font-bold
            border
            border-slate-700
            transition-all
            shadow-sm
            active:scale-95
            cursor-pointer
            touch-manipulation
          "
          title="Baixar Recibo em PDF / Imprimir Ata"
        >
          <Download
            className="
              w-3.5
              h-3.5
              text-emerald-400
            "
          />

          <Printer
            className="
              w-3.5
              h-3.5
              text-amber-400
            "
          />

          <span>
            Baixar PDF / Imprimir
          </span>
        </button>

        {/* NOVO CAIXA */}

        <button
          type="button"
          onClick={onNovoFechamento}
          className="
            flex
            items-center
            gap-1.5
            px-3
            py-2
            rounded-xl
            bg-amber-600
            hover:bg-amber-500
            text-slate-950
            font-bold
            text-xs
            transition-all
            shadow-lg
            shadow-amber-600/20
            active:scale-95
            cursor-pointer
            touch-manipulation
          "
          title="Iniciar Novo Fechamento de Caixa"
        >
          <RefreshCw
            className="
              w-3.5
              h-3.5
              text-slate-950
            "
          />

          <span>
            Novo Caixa
          </span>
        </button>

      </div>

    </header>
  );
};