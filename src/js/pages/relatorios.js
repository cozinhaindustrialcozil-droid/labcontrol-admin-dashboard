import { fetchData, getDashboardStats, getTempoMedioPorResponsavel, getEvolucaoMensal, isAtrasada, formatDate, STATUS_COLORS } from '../lab-data.js';

const PRIO_COLORS = { 'Urgente': 'bg-rose-100 text-rose-700', 'Alta': 'bg-red-100 text-red-700', 'Média': 'bg-yellow-100 text-yellow-700', 'Baixa': 'bg-green-100 text-green-700' };

function tableHtml(headers, rows, caption = '') {
  return `
    ${caption ? `<p class="text-sm text-gray-500 mb-3">${caption}</p>` : ''}
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="bg-gray-50 dark:bg-gray-800">
          ${headers.map(h => `<th class="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `<tr class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">${row.map(c => `<td class="border border-gray-200 dark:border-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300">${c}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>`;
}

async function gerarRelatorio(type) {
  const data = await fetchData();
  const output = document.getElementById('report-output');
  const content = document.getElementById('report-content');
  const title = document.getElementById('report-title');
  if (!output || !content || !title) return;

  const stats = getDashboardStats(data);

  const badge = (status) => {
    const sc = STATUS_COLORS[status] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
    return `<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.text}"><span class="w-1.5 h-1.5 rounded-full ${sc.dot}"></span>${status}</span>`;
  };

  let html = '';

  if (type === 'executivo') {
    title.textContent = `Relatório Executivo — ${new Date().toLocaleDateString('pt-BR')}`;
    html = `
      <div class="grid grid-cols-3 gap-4 mb-6 sm:grid-cols-6">
        ${[['Total',stats.total,'blue'],['Em Análise',stats.emAnalise,'yellow'],['Em Teste',stats.emTeste,'purple'],['Finalizadas',stats.finalizadas,'green'],['Canceladas',stats.canceladas,'red'],['Atrasadas',stats.atrasadas,'orange']].map(([l,v,c]) => `
          <div class="rounded-xl bg-${c}-50 border border-${c}-200 p-3 text-center dark:bg-${c}-900/10 dark:border-${c}-800/40">
            <p class="text-2xl font-bold text-${c}-700 dark:text-${c}-400">${v}</p>
            <p class="text-xs text-${c}-600 dark:text-${c}-500">${l}</p>
          </div>`).join('')}
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Tempo médio de atendimento: <strong>${stats.tempoMedio} dias</strong></p>
      ${tableHtml(['Nº Sol.','Cliente','Equipamento','Prioridade','Status','Responsável','Previsão'],
        data.slice(0,20).map(r => [r.nSolicitacao, r.cliente, r.equipamento, r.prioridade, badge(r.status), r.responsavel, formatDate(r.previsao)])
      , 'Últimas 20 solicitações:')}`;

  } else if (type === 'finalizadas') {
    title.textContent = 'Relatório — Solicitações Finalizadas';
    const fin = data.filter(d => d.status === 'Finalizada');
    html = `<p class="text-sm text-gray-500 mb-4">Total: <strong>${fin.length}</strong> solicitações finalizadas</p>` +
      tableHtml(['Nº Sol.','Cliente','Equipamento','Responsável','Data Finalização','Conclusão','Melhorias'],
        fin.map(r => [r.nSolicitacao, r.cliente, r.equipamento, r.responsavel, formatDate(r.dataFinalizacao), r.conclusao || '—', r.melhorias || '—']));

  } else if (type === 'atrasadas') {
    title.textContent = 'Relatório — Solicitações Atrasadas';
    const atr = data.filter(r => isAtrasada(r));
    html = `<p class="text-sm text-orange-600 mb-4 font-medium">⚠️ ${atr.length} solicitação(ões) com prazo vencido</p>` +
      tableHtml(['Nº Sol.','Cliente','Equipamento','Status','Prioridade','Responsável','Previsão'],
        atr.map(r => [r.nSolicitacao, r.cliente, r.equipamento, badge(r.status), r.prioridade, r.responsavel, `<span class="text-orange-600 font-semibold">${formatDate(r.previsao)}</span>`]));

  } else if (type === 'responsavel') {
    title.textContent = 'Relatório — Por Responsável Técnico';
    const resp = getTempoMedioPorResponsavel(data);
    const counts = {};
    data.forEach(d => { counts[d.responsavel] = (counts[d.responsavel] || { total:0, abertos:0 }); counts[d.responsavel].total++; if (!['Finalizada','Cancelada'].includes(d.status)) counts[d.responsavel].abertos++; });
    html = tableHtml(['Responsável','Total Solicitações','Em Aberto','Finalizadas','Tempo Médio (dias)'],
      Object.entries(counts).map(([nome, c]) => {
        const tm = resp.find(r => r.nome === nome);
        return [nome, c.total, c.abertos, c.total - c.abertos, tm ? `${tm.media}d` : '—'];
      }));

  } else if (type === 'mensal') {
    title.textContent = 'Relatório Mensal de Solicitações';
    const evolucao = getEvolucaoMensal(data);
    const monthlyStatus = {};
    data.forEach(d => {
      if (!d.datasolicitacao) return;
      const dt = new Date(d.datasolicitacao);
      const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
      if (!monthlyStatus[key]) monthlyStatus[key] = { total:0, finalizadas:0, canceladas:0, emAberto:0 };
      monthlyStatus[key].total++;
      if (d.status === 'Finalizada') monthlyStatus[key].finalizadas++;
      else if (d.status === 'Cancelada') monthlyStatus[key].canceladas++;
      else monthlyStatus[key].emAberto++;
    });
    html = tableHtml(['Mês','Total','Finalizadas','Canceladas','Em Aberto'],
      Object.entries(monthlyStatus).sort((a,b) => a[0].localeCompare(b[0])).map(([k, m]) => {
        const [y, mo] = k.split('-');
        const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return [`${names[parseInt(mo)-1]}/${y}`, m.total, m.finalizadas, m.canceladas, m.emAberto];
      }));

  } else if (type === 'csv') {
    const headers = ['Nº Solicitação','Data','Cliente','Solicitante','Setor','Equipamento','Código','Prioridade','Status','Responsável','Previsão','Conclusão'];
    const rows = data.map(r => [r.nSolicitacao, r.datasolicitacao, r.cliente, r.solicitante, r.setor, r.equipamento, r.codigo, r.prioridade, r.status, r.responsavel, r.previsao, r.conclusao].map(v => `"${(v||'').replace(/"/g,'""')}"`));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `labcontrol-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    return;
  }

  content.innerHTML = html;
  output.classList.remove('hidden');
  output.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export async function initRelatorios() {
  document.querySelectorAll('.btn-report').forEach(btn => {
    btn.addEventListener('click', () => gerarRelatorio(btn.dataset.type));
  });
  document.getElementById('btn-close-report')?.addEventListener('click', () => {
    document.getElementById('report-output')?.classList.add('hidden');
  });
}
