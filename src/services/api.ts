import { FechamentoCulto } from '../types';

export async function generateChurchReport(fechamentoData: FechamentoCulto): Promise<string> {
  const res = await fetch('/api/gemini/church-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fechamentoData }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao gerar relatório com IA.');
  }

  const data = await res.json();
  return data.report;
}
