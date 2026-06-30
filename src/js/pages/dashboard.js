import ApexCharts from 'apexcharts';
import { fetchData, getDashboardStats, getStatusCounts, getSetorCounts, getPrioridadeCounts, getEvolucaoMensal, STATUS_COLORS, formatDate, isAtrasada, startAutoRefresh, syncStatus } from '../lab-data.js';

let chartStatus, chartSetor, chartEvolucao, chartPrioridade;

// Cores NEXLAB para gráficos
const NEXLAB_PRIMARY = '#0F4C5C';
const NEXLAB_AMBER   = '#E2A634';

const PRIO_HEX = { 'Crítica': '#DC2626', 'Alta': '#F97316', 'Média': '#EAB308', 'Baixa': '#16A34A', 'Urgente': '#DC2626' };
const PRIO_LABEL = { 'Urgente': 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400', 'Alta': 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400', 'Média': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400', 'Baixa': 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' };

function set(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

function renderKPIs(stats, statusCounts) {
  set('kpi-total', stats.total);
  set('kpi-atrasadas', stats.atrasadas);

  // Novos KPIs por status
  set('kpi-analise', statusCounts['Em análise'] || statusCounts['Em Análise'] || 0);
  set('kpi-teste', statusCounts['Em teste'] || statusCounts['Em Teste'] || 0);
  set('kpi-finalizadas', stats.finalizadas);
  set('kpi-canceladas', statusCounts['Cancelada'] || statusCounts['Cancelado'] || 0);

  const taxa = stats.total > 0 ? Math.round((stats.finalizadas / stats.total) * 100) : 0;
  set('kpi-taxa', taxa + '%');
  set('kpi-finalizadas-txt', taxa + '%');

  // Destaque visual no card de atrasadas
  const cardAtrasadas = document.getElementById('card-atrasadas');
  if (cardAtrasadas && stats.atrasadas > 0) {
    cardAtrasadas.style.borderColor = '#F97316';
    cardAtrasadas.style.backgroundColor = '#fff7ed';
  }

  const upd = document.getElementById('last-update');
  if (upd) {
    const hora = new Date().toLocaleTimeString('pt-BR');
    const fonte = syncStatus.source === 'google_sheets' ? ' · Google Sheets' : syncStatus.source === 'api' ? ' · API' : syncStatus.ok === false ? ' · dados locais' : '';
    upd.textContent = `Atualizado: ${hora}${fonte}`;
    upd.title = syncStatus.error ? `Erro: ${syncStatus.error}` : `Fonte: ${syncStatus.source || 'cache local'}`;
    upd.className = syncStatus.ok === false
      ? 'text-xs text-orange-500'
      : 'text-xs text-gray-400';
  }
}

function renderStatusList(statusCounts) {
  const container = document.getElementById('status-list');
  if (!container) return;

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const entries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);

  container.innerHTML = entries.map(([label, count]) => {
    const sc = STATUS_COLORS[label] || { hex: '#6B7280', bg: 'bg-gray-100', text: 'text-gray-700' };
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <div class="flex items-center gap-2 group">
        <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${sc.hex}"></span>
        <span class="flex-1 min-w-0 text-xs text-gray-600 dark:text-gray-300 truncate">${label}</span>
        <div class="flex items-center gap-2 flex-shrink-0">
          <div class="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div class="h-full rounded-full" style="width:${pct}%;background:${sc.hex}"></div>
          </div>
          <span class="text-xs font-semibold text-gray-800 dark:text-white/80 w-5 text-right">${count}</span>
        </div>
      </div>`;
  }).join('');
}

function renderStatusChart(statusCounts) {
  const labels = Object.keys(statusCounts);
  const values = Object.values(statusCounts);
  const colors = labels.map(l => STATUS_COLORS[l]?.hex || '#6B7280');

  if (chartStatus) { chartStatus.destroy(); }
  chartStatus = new ApexCharts(document.getElementById('chartStatus'), {
    chart: { type: 'donut', height: 180, toolbar: { show: false }, fontFamily: 'Outfit, sans-serif' },
    series: values,
    labels,
    colors,
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontSize: '12px',
              color: '#9CA3AF',
              formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0)
            }
          }
        }
      }
    },
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: ['#fff'] },
    tooltip: { y: { formatter: (v) => `${v} solicitações` } },
  });
  chartStatus.render();

  const legend = document.getElementById('legend-status');
  if (legend) {
    legend.innerHTML = labels.map((l, i) => `
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${colors[i]}"></span>
          <span class="text-xs text-gray-500 dark:text-gray-400 truncate">${l}</span>
        </div>
        <span class="text-xs font-semibold text-gray-700 dark:text-white/80 flex-shrink-0">${values[i]}</span>
      </div>`).join('');
  }
}

function renderSetorChart(setorData) {
  const labels = setorData.map(([s]) => s);
  const values = setorData.map(([, c]) => c);

  if (chartSetor) { chartSetor.destroy(); }
  chartSetor = new ApexCharts(document.getElementById('chartSetor'), {
    chart: { type: 'bar', height: 220, toolbar: { show: false }, fontFamily: '"IBM Plex Sans", sans-serif' },
    series: [{ name: 'Solicitações', data: values }],
    xaxis: { categories: labels, labels: { style: { fontSize: '11px', colors: '#9CA3AF' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: '#9CA3AF', fontSize: '11px' } } },
    colors: [NEXLAB_PRIMARY],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } },
    dataLabels: { enabled: false },
    grid: { borderColor: '#F3F4F6', strokeDashArray: 4, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
    tooltip: { y: { formatter: (v) => `${v} solicitações` }, theme: 'light' },
  });
  chartSetor.render();
}

function renderEvolucaoChart(evolucao) {
  if (chartEvolucao) { chartEvolucao.destroy(); }
  chartEvolucao = new ApexCharts(document.getElementById('chartEvolucao'), {
    chart: { type: 'area', height: 230, toolbar: { show: false }, fontFamily: '"IBM Plex Sans", sans-serif' },
    series: [{ name: 'Solicitações', data: evolucao.values }],
    xaxis: { categories: evolucao.labels, labels: { style: { fontSize: '11px', colors: '#9CA3AF' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: '#9CA3AF', fontSize: '11px' } }, min: 0 },
    colors: [NEXLAB_PRIMARY],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.02, stops: [0, 100] } },
    stroke: { curve: 'smooth', width: 2 },
    grid: { borderColor: '#F3F4F6', strokeDashArray: 4 },
    dataLabels: { enabled: false },
    markers: { size: 3, colors: [NEXLAB_PRIMARY], strokeColors: '#fff', strokeWidth: 2 },
    tooltip: { y: { formatter: (v) => `${v} solicitações` }, theme: 'light' },
  });
  chartEvolucao.render();
}

function renderPrioridadeChart(prioData) {
  if (chartPrioridade) { chartPrioridade.destroy(); }
  chartPrioridade = new ApexCharts(document.getElementById('chartPrioridade'), {
    chart: { type: 'bar', height: 230, toolbar: { show: false }, fontFamily: 'Outfit, sans-serif' },
    series: [{ name: 'Qtd', data: prioData.map(p => p.count) }],
    xaxis: { categories: prioData.map(p => p.prioridade), labels: { style: { fontSize: '11px', colors: '#9CA3AF' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: '#9CA3AF', fontSize: '11px' } } },
    colors: prioData.map(p => PRIO_HEX[p.prioridade] || '#6B7280'),
    plotOptions: { bar: { borderRadius: 4, columnWidth: '45%', distributed: true } },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: '#F3F4F6', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `${v} solicitações` }, theme: 'light' },
  });
  chartPrioridade.render();
}

function renderTabelaRecentes(data) {
  const tbody = document.getElementById('table-recentes');
  if (!tbody) return;
  const recent = [...data].sort((a, b) => new Date(b.datasolicitacao) - new Date(a.datasolicitacao)).slice(0, 8);

  tbody.innerHTML = recent.map(r => {
    const sc = STATUS_COLORS[r.status] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
    const pc = PRIO_LABEL[r.prioridade] || 'bg-gray-50 text-gray-600';
    const atrasado = isAtrasada(r);
    return `<tr class="border-b border-gray-50 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-white/[0.02] transition-colors">
      <td class="px-5 py-3 sm:px-6">
        <a href="solicitacoes.html" class="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs">${r.nSolicitacao}</a>
      </td>
      <td class="px-3 py-3 text-xs font-medium text-gray-700 dark:text-white/80">${r.cliente}</td>
      <td class="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[130px] truncate">${r.equipamento}</td>
      <td class="px-3 py-3">
        <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${pc}">${r.prioridade}</span>
      </td>
      <td class="px-3 py-3">
        <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.text}">
          <span class="w-1.5 h-1.5 rounded-full ${sc.dot}"></span>
          ${r.status}
        </span>
      </td>
      <td class="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">${r.responsavel}</td>
      <td class="px-3 py-3 text-xs ${atrasado ? 'text-orange-500 font-semibold' : 'text-gray-500 dark:text-gray-400'}">${formatDate(r.previsao)}${atrasado ? ' ⚠' : ''}</td>
    </tr>`;
  }).join('');
}

async function renderDashboard(data) {
  const stats = getDashboardStats(data);
  const statusCounts = getStatusCounts(data);
  renderKPIs(stats, statusCounts);
  renderStatusList(statusCounts);
  renderStatusChart(getStatusCounts(data));
  renderSetorChart(getSetorCounts(data));
  renderEvolucaoChart(getEvolucaoMensal(data));
  renderPrioridadeChart(getPrioridadeCounts(data));
  renderTabelaRecentes(data);
}

export async function initDashboard() {
  const data = await fetchData();
  await renderDashboard(data);

  const btnRefresh = document.getElementById('btn-refresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      btnRefresh.textContent = 'Atualizando...';
      btnRefresh.disabled = true;
      const fresh = await fetchData(true);
      await renderDashboard(fresh);
      btnRefresh.disabled = false;
      btnRefresh.innerHTML = `<svg class="fill-current inline mr-1" width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>Atualizar`;
    });
  }

  startAutoRefresh(async (fresh) => await renderDashboard(fresh));
}
