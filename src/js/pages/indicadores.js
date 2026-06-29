import ApexCharts from 'apexcharts';
import { fetchData, getDashboardStats, getTopClientes, getTopEquipamentos, getSetorCounts, getTempoMedioPorResponsavel, getEvolucaoMensal, isAtrasada, startAutoRefresh } from '../lab-data.js';

let chartMensal;

function renderTopList(containerId, items, maxValue) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items.map(([name, count], i) => {
    const pct = maxValue > 0 ? Math.round((count / maxValue) * 100) : 0;
    return `
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-gray-400 w-5 text-right">${i+1}</span>
        <div class="flex-1">
          <div class="flex items-center justify-between mb-0.5">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">${name}</span>
            <span class="text-xs font-bold text-gray-800 dark:text-gray-200 ml-2">${count}</span>
          </div>
          <div class="bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
            <div class="bg-blue-500 rounded-full h-1.5" style="width:${pct}%"></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderResponsaveis(data) {
  const el = document.getElementById('resp-list');
  if (!el) return;
  const responsaveis = getTempoMedioPorResponsavel(data);
  const maxDias = Math.max(...responsaveis.map(r => r.media), 1);
  el.innerHTML = responsaveis.map(r => {
    const pct = Math.round((r.media / maxDias) * 100);
    const color = r.media <= 10 ? 'bg-green-500' : r.media <= 20 ? 'bg-yellow-500' : 'bg-orange-500';
    return `
      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${r.nome}</span>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400">${r.total} finalizados</span>
            <span class="text-sm font-bold text-gray-800 dark:text-gray-200">${r.media}d</span>
          </div>
        </div>
        <div class="bg-gray-100 dark:bg-gray-700 rounded-full h-2">
          <div class="${color} rounded-full h-2 transition-all" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

function renderMensalChart(data) {
  const evolucao = getEvolucaoMensal(data);
  if (chartMensal) chartMensal.destroy();
  chartMensal = new ApexCharts(document.getElementById('chartMensal'), {
    chart: { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'inherit' },
    series: [{ name: 'Solicitações', data: evolucao.values }],
    xaxis: { categories: evolucao.labels, labels: { style: { fontSize: '10px', colors: '#6B7280' } } },
    yaxis: { labels: { style: { colors: '#6B7280' } }, min: 0 },
    colors: ['#3B82F6'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    dataLabels: { enabled: true, style: { fontSize: '10px' } },
    grid: { borderColor: '#F3F4F6' },
  });
  chartMensal.render();
}

async function renderIndicadores(data) {
  const stats = getDashboardStats(data);
  const total = data.length;

  const taxaFin = total > 0 ? Math.round((stats.finalizadas / total) * 100) : 0;
  const emAberto = data.filter(d => !['Finalizada','Cancelada'].includes(d.status)).length;
  const atrasadas = data.filter(d => isAtrasada(d)).length;
  const taxaAtraso = emAberto > 0 ? Math.round((atrasadas / emAberto) * 100) : 0;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('taxa-finalizacao', `${taxaFin}%`);
  set('taxa-atraso', `${taxaAtraso}%`);
  set('tempo-medio-ind', stats.tempoMedio);
  set('txt-finalizacao', `${stats.finalizadas} de ${total} solicitações concluídas`);
  set('txt-atraso', `${atrasadas} de ${emAberto} em aberto estão atrasadas`);
  set('txt-tempo-medio', `Baseado em ${stats.finalizadas} solicitações finalizadas`);

  const barFin = document.getElementById('bar-finalizacao');
  if (barFin) barFin.style.width = taxaFin + '%';
  const barAtr = document.getElementById('bar-atraso');
  if (barAtr) barAtr.style.width = Math.min(100, taxaAtraso) + '%';

  const clientes = getTopClientes(data);
  const equipamentos = getTopEquipamentos(data);
  const setores = getSetorCounts(data);
  const maxC = clientes[0]?.[1] || 1;
  const maxE = equipamentos[0]?.[1] || 1;
  const maxS = setores[0]?.[1] || 1;

  renderTopList('top-clientes', clientes, maxC);
  renderTopList('top-equipamentos', equipamentos, maxE);
  renderTopList('top-setores', setores, maxS);
  renderResponsaveis(data);
  renderMensalChart(data);
}

export async function initIndicadores() {
  const data = await fetchData();
  await renderIndicadores(data);
  startAutoRefresh(async (fresh) => await renderIndicadores(fresh));
}
