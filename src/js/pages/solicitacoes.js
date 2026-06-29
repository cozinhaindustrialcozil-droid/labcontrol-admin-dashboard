import { fetchData, STATUS_COLORS, PRIORIDADE_COLORS, formatDate, isAtrasada, startAutoRefresh } from '../lab-data.js';

let allData = [];
let filteredData = [];
let currentPage = 1;
const PER_PAGE = 15;
let sortCol = 'datasolicitacao';
let sortDir = -1;

const PRIO_COLORS = { 'Urgente': 'bg-rose-100 text-rose-700', 'Alta': 'bg-red-100 text-red-700', 'Média': 'bg-yellow-100 text-yellow-700', 'Baixa': 'bg-green-100 text-green-700' };

function applyFilters() {
  const search = (document.getElementById('search-sol')?.value || '').toLowerCase();
  const status = document.getElementById('filter-status')?.value || '';
  const prio = document.getElementById('filter-prioridade')?.value || '';

  filteredData = allData.filter(r => {
    const matchSearch = !search ||
      r.nSolicitacao.toLowerCase().includes(search) ||
      r.cliente.toLowerCase().includes(search) ||
      r.equipamento.toLowerCase().includes(search) ||
      r.solicitante.toLowerCase().includes(search) ||
      (r.codigo || '').toLowerCase().includes(search);
    const matchStatus = !status || r.status === status;
    const matchPrio = !prio || r.prioridade === prio;
    return matchSearch && matchStatus && matchPrio;
  });

  filteredData.sort((a, b) => {
    const va = a[sortCol] || '';
    const vb = b[sortCol] || '';
    return va < vb ? sortDir : va > vb ? -sortDir : 0;
  });

  currentPage = 1;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('table-sol');
  const count = document.getElementById('table-count');
  const pageInfo = document.getElementById('page-info');
  if (!tbody) return;

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PER_PAGE));
  const start = (currentPage - 1) * PER_PAGE;
  const page = filteredData.slice(start, start + PER_PAGE);

  if (count) count.textContent = `${filteredData.length} solicitação(ões) encontrada(s)`;
  if (pageInfo) pageInfo.textContent = `${currentPage} / ${totalPages}`;

  if (page.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="px-5 py-10 text-center text-gray-400">Nenhuma solicitação encontrada</td></tr>`;
  } else {
    tbody.innerHTML = page.map(r => {
      const sc = STATUS_COLORS[r.status] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
      const pc = PRIO_COLORS[r.prioridade] || 'bg-gray-100 text-gray-700';
      const atrasado = isAtrasada(r);
      return `<tr class="border-b border-gray-50 hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors" data-id="${r.nSolicitacao}">
        <td class="px-4 py-3 font-medium text-blue-600 dark:text-blue-400 text-sm">${r.nSolicitacao}</td>
        <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">${formatDate(r.datasolicitacao)}</td>
        <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 font-medium">${r.cliente}</td>
        <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">${r.solicitante}</td>
        <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[140px] truncate">${r.equipamento}</td>
        <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-500">${r.codigo}</td>
        <td class="px-4 py-3"><span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${pc}">${r.prioridade}</span></td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.bg} ${sc.text}">
            <span class="w-1.5 h-1.5 rounded-full ${sc.dot}"></span>${r.status}
          </span>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">${r.responsavel}</td>
        <td class="px-4 py-3 text-sm whitespace-nowrap ${atrasado ? 'text-orange-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}">${formatDate(r.previsao)}${atrasado ? ' ⚠️' : ''}</td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('tr[data-id]').forEach(row => {
      row.addEventListener('click', () => openModal(row.dataset.id));
    });
  }

  renderPagination(totalPages);
  const prev = document.getElementById('btn-prev');
  const next = document.getElementById('btn-next');
  if (prev) prev.disabled = currentPage <= 1;
  if (next) next.disabled = currentPage >= totalPages;
}

function renderPagination(totalPages) {
  const container = document.getElementById('pagination-pages');
  if (!container) return;
  const pages = [];
  for (let i = 1; i <= Math.min(totalPages, 7); i++) pages.push(i);
  container.innerHTML = pages.map(p => `
    <button class="px-3 py-1 rounded text-sm ${p === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400'}" data-page="${p}">${p}</button>
  `).join('');
  container.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => { currentPage = parseInt(btn.dataset.page); renderTable(); });
  });
}

function openModal(id) {
  const r = allData.find(d => d.nSolicitacao === id);
  if (!r) return;
  const modal = document.getElementById('modal-detalhe');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  if (!modal || !title || !body) return;

  const sc = STATUS_COLORS[r.status] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
  const PRIO_COLORS2 = { 'Urgente': 'bg-rose-100 text-rose-700', 'Alta': 'bg-red-100 text-red-700', 'Média': 'bg-yellow-100 text-yellow-700', 'Baixa': 'bg-green-100 text-green-700' };

  title.textContent = `${r.nSolicitacao} — ${r.equipamento}`;

  const field = (label, value, full = false) => `
    <div class="${full ? 'col-span-1 sm:col-span-2' : ''}">
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">${label}</p>
      <p class="text-sm text-gray-800 dark:text-gray-200">${value || '—'}</p>
    </div>`;

  body.innerHTML = `
    ${field('Nº Solicitação', r.nSolicitacao)}
    ${field('Data da Solicitação', formatDate(r.datasolicitacao))}
    ${field('Solicitante', r.solicitante)}
    ${field('Cliente', r.cliente)}
    ${field('Setor', r.setor)}
    ${field('Equipamento', r.equipamento)}
    ${field('Código / Componente', r.codigo)}
    ${field('Número de Série', r.serie)}
    <div>
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</p>
      <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.bg} ${sc.text}"><span class="w-1.5 h-1.5 rounded-full ${sc.dot}"></span>${r.status}</span>
    </div>
    <div>
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Prioridade</p>
      <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIO_COLORS2[r.prioridade] || 'bg-gray-100 text-gray-700'}">${r.prioridade}</span>
    </div>
    ${field('Responsável Técnico', r.responsavel)}
    ${field('Previsão de Devolutiva', formatDate(r.previsao))}
    ${field('Objetivo do Teste', r.objetivo, true)}
    ${field('Resultado Esperado', r.resultadoEsperado, true)}
    ${field('Motivo da Solicitação', r.motivo, true)}
    ${r.conclusao ? field('Conclusão Técnica', r.conclusao, true) : ''}
    ${r.melhorias ? field('Melhorias Identificadas', r.melhorias, true) : ''}
    ${r.dataFinalizacao ? field('Data de Finalização', formatDate(r.dataFinalizacao)) : ''}
  `;

  modal.classList.remove('hidden');
}

function exportCSV() {
  const headers = ['Nº Solicitação','Data','Cliente','Solicitante','Setor','Equipamento','Código','Série','Prioridade','Status','Responsável','Previsão','Objetivo','Resultado Esperado','Conclusão','Data Finalização'];
  const rows = filteredData.map(r => [r.nSolicitacao, r.datasolicitacao, r.cliente, r.solicitante, r.setor, r.equipamento, r.codigo, r.serie, r.prioridade, r.status, r.responsavel, r.previsao, r.objetivo, r.resultadoEsperado, r.conclusao, r.dataFinalizacao].map(v => `"${(v||'').replace(/"/g,'""')}"`));
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `labcontrol-solicitacoes-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

export async function initSolicitacoes() {
  allData = await fetchData();
  filteredData = [...allData];
  applyFilters();

  document.getElementById('search-sol')?.addEventListener('input', applyFilters);
  document.getElementById('filter-status')?.addEventListener('change', applyFilters);
  document.getElementById('filter-prioridade')?.addEventListener('change', applyFilters);
  document.getElementById('btn-limpar-filtros')?.addEventListener('click', () => {
    const s = document.getElementById('search-sol'); if (s) s.value = '';
    const fs = document.getElementById('filter-status'); if (fs) fs.value = '';
    const fp = document.getElementById('filter-prioridade'); if (fp) fp.value = '';
    applyFilters();
  });
  document.getElementById('btn-prev')?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
  document.getElementById('btn-next')?.addEventListener('click', () => { const tp = Math.ceil(filteredData.length / PER_PAGE); if (currentPage < tp) { currentPage++; renderTable(); } });
  document.getElementById('btn-export-excel')?.addEventListener('click', exportCSV);
  document.getElementById('btn-export-pdf')?.addEventListener('click', () => { window.print(); });
  document.getElementById('modal-close')?.addEventListener('click', () => { document.getElementById('modal-detalhe')?.classList.add('hidden'); });
  document.getElementById('modal-detalhe')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden'); });

  document.querySelectorAll('th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1; }
      applyFilters();
    });
  });

  startAutoRefresh(async (fresh) => { allData = fresh; applyFilters(); });
}
