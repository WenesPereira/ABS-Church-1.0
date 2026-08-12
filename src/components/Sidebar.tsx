import React from 'react';

import {
  FileCheck,
  PlusCircle,
  Coins,
  History,
  Sparkles,
  Settings,
  Church,
  ShieldCheck,
} from 'lucide-react';

import { ActiveTab } from '../types';


interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  qtdLancamentos: number;
}


export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  qtdLancamentos,
}) => {

  const navItems = [

    {
      id: 'fechamento' as ActiveTab,
      label: 'Fechamento de Caixa',
      shortLabel: 'Fechamento',
      description: 'Resumo geral e conferência do caixa',
      icon: FileCheck,
      badge: 'Principal',
    },

    {
      id: 'lancamentos' as ActiveTab,
      label: 'Dízimos & Ofertas',
      shortLabel: 'Dízimos & Ofertas',
      description: 'Lançamento de dízimos, ofertas e despesas',
      icon: PlusCircle,
      badge: `${qtdLancamentos} itens`,
    },

    {
      id: 'contagem' as ActiveTab,
      label: 'Contador de Cédulas',
      shortLabel: 'Calculadora Cédulas',
      description: 'Conferência física de notas e moedas',
      icon: Coins,
      badge: 'Espécie',
    },

    {
      id: 'historico' as ActiveTab,
      label: 'Histórico & Arquivo',
      shortLabel: 'Histórico',
      description: 'Consultar fechamentos anteriores',
      icon: History,
      badge: 'Arquivo',
    },

    {
      id: 'relatorio_ia' as ActiveTab,
      label: 'Relatório IA Tesouraria',
      shortLabel: 'Relatório IA',
      description: 'Auditoria e parecer formal com Gemini',
      icon: Sparkles,
      badge: 'IA Gemini',
    },

    {
      id: 'config' as ActiveTab,
      label: 'Dados da Igreja',
      shortLabel: 'Dados Igreja',
      description: 'Configurar igreja, pastor e tesoureiros',
      icon: Settings,
      badge: 'Ajustes',
    },
  ];


  return (
    <>
      {/* =====================================================
          MENU MOBILE
          ===================================================== */}

      <nav
        id="mobile-app-nav"
        className="
          lg:hidden
          w-full
          bg-slate-900
          border-b
          border-slate-800
          px-2
          py-2
          flex
          flex-row
          items-center
          gap-2
          overflow-x-auto
          overflow-y-hidden
          shrink-0
          z-20
        "
      >

        {navItems.map((item) => {

          const Icon =
            item.icon;

          const isActive =
            activeTab === item.id;


          return (

            <button
              key={item.id}
              type="button"
              onClick={() =>
                setActiveTab(
                  item.id
                )
              }
              className={`
                flex
                items-center
                gap-2
                px-3
                py-2
                rounded-xl
                text-xs
                font-bold
                whitespace-nowrap
                transition-all
                shrink-0
                cursor-pointer
                select-none

                ${
                  isActive

                    ? `
                      bg-amber-500
                      text-slate-950
                      shadow-md
                      shadow-amber-500/20
                    `

                    : `
                      bg-slate-950
                      text-slate-400
                      border
                      border-slate-800
                    `
                }
              `}
            >

              <Icon className="w-3.5 h-3.5 shrink-0" />

              <span>
                {item.shortLabel}
              </span>


              {item.id === 'lancamentos' &&
                qtdLancamentos > 0 && (

                  <span
                    className={`
                      text-[9px]
                      px-1.5
                      py-0.5
                      rounded-full
                      font-mono

                      ${
                        isActive
                          ? 'bg-slate-950 text-amber-300'
                          : 'bg-slate-800 text-amber-400'
                      }
                    `}
                  >
                    {qtdLancamentos}
                  </span>

                )}

            </button>

          );
        })}

      </nav>


      {/* =====================================================
          SIDEBAR DESKTOP
          ===================================================== */}

      <aside
        id="app-sidebar"
        className="
          hidden
          lg:flex
          w-72
          bg-slate-900
          border-r
          border-slate-800
          text-slate-300
          flex-col
          justify-between
          shrink-0
        "
      >

        <div className="p-4 space-y-1.5">

          <div
            className="
              px-3
              py-2
              text-[11px]
              font-bold
              text-amber-400
              uppercase
              tracking-widest
              flex
              items-center
              gap-1.5
            "
          >

            <Church
              className="
                w-3.5
                h-3.5
                text-amber-400
              "
            />

            <span>
              Módulos da Tesouraria
            </span>

          </div>


          <nav className="space-y-1">

            {navItems.map((item) => {

              const Icon =
                item.icon;

              const isActive =
                activeTab === item.id;


              return (

                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      item.id
                    )
                  }
                  className={`
                    w-full
                    flex
                    items-center
                    gap-3
                    px-3.5
                    py-3
                    rounded-2xl
                    transition-all
                    text-left
                    group
                    relative
                    cursor-pointer

                    ${
                      isActive

                        ? `
                          bg-amber-500/15
                          text-white
                          border
                          border-amber-500/30
                          font-semibold
                          shadow-inner
                        `

                        : `
                          hover:bg-slate-800/80
                          hover:text-slate-100
                          text-slate-400
                          border
                          border-transparent
                        `
                    }
                  `}
                >

                  {isActive && (

                    <div
                      className="
                        absolute
                        left-0
                        top-2
                        bottom-2
                        w-1
                        bg-amber-500
                        rounded-r-full
                      "
                    />

                  )}


                  <div
                    className={`
                      p-2
                      rounded-xl
                      transition-colors

                      ${
                        isActive

                          ? `
                            bg-amber-500
                            text-slate-950
                            shadow-md
                            shadow-amber-500/20
                          `

                          : `
                            bg-slate-800/80
                            text-slate-400
                            group-hover:bg-slate-700/80
                            group-hover:text-slate-200
                          `
                      }
                    `}
                  >

                    <Icon
                      className="
                        w-4
                        h-4
                      "
                    />

                  </div>


                  <div className="flex-1 min-w-0">

                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        gap-1
                      "
                    >

                      <span
                        className="
                          text-xs
                          md:text-sm
                          truncate
                          font-medium
                        "
                      >
                        {item.label}
                      </span>


                      {item.badge && (

                        <span
                          className={`
                            text-[9px]
                            px-1.5
                            py-0.5
                            rounded
                            font-mono

                            ${
                              isActive

                                ? `
                                  bg-amber-500/20
                                  text-amber-300
                                  border
                                  border-amber-500/30
                                `

                                : `
                                  bg-slate-800
                                  text-slate-500
                                  border
                                  border-slate-700/60
                                `
                            }
                          `}
                        >
                          {item.badge}
                        </span>

                      )}

                    </div>


                    <p
                      className="
                        text-[10px]
                        text-slate-500
                        truncate
                        mt-0.5
                      "
                    >
                      {item.description}
                    </p>

                  </div>

                </button>

              );
            })}

          </nav>

        </div>


        {/* ===================================================
            AVISO DE SEGURANÇA
            =================================================== */}

        <div
          className="
            p-4
            border-t
            border-slate-800/80
            bg-slate-950/50
          "
        >

          <div
            className="
              bg-slate-800/50
              rounded-2xl
              p-3
              border
              border-slate-700/50
              flex
              items-start
              gap-2.5
            "
          >

            <ShieldCheck
              className="
                w-4
                h-4
                text-emerald-400
                shrink-0
                mt-0.5
              "
            />


            <div
              className="
                text-xs
                text-slate-400
              "
            >

              <p
                className="
                  font-semibold
                  text-slate-200
                  text-[11px]
                "
              >
                Transparência e Ética
              </p>


              <p
                className="
                  mt-0.5
                  text-[10px]
                  leading-relaxed
                  text-slate-400
                "
              >
                Lançamentos com data automática e
                auditoria de tesouraria.
              </p>

            </div>

          </div>

        </div>

      </aside>
    </>
  );
};