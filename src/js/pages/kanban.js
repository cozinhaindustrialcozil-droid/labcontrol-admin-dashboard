import { fetchData, getKanbanColumns, STATUS_COLORS, PRIORIDADE_COLORS, formatDate, isAtrasada, startAutoRefresh } from '../lab-data.js';

const PRIO_COLORS = { 'Urgente': 'bg-rose-100 text-rose-700 border-rose-200', 'Alta': 'bg-red-100 text-red-700 border-red-200', 'Média': 'bg-yellow-100 text-yellow-700 border-yellow-200', 'Baixa': 'bg-green-100 text-green-700 border-green-200' };

const COL_STYLE = {
  'Aberta':                     { header: 'bg-blue-50 border-blue-200',   title: 'text-blue-700',   dot: 'bg-blue-500',   count: 'bg-blue-100 text-blue-600' },
  'Em análise':                 { header: 'bg-yellow-50 border-yellow-200', title: 'text-yellow-700', dot: 'bg-yellow-500', count: 'bg-yellow-100 text-yellow-600' },
  'Aguardando material':        { header: 'bg-orange-50 border-orange-200', title: 'text-orange-700', dot: 'bg-orange-500', count: 'bg-orange-100 text-orange-600' },
  'Em teste':                   { header: 'bg-purple-50 border-purple-200', title: 'text-purple-700', dot: 'bg-purple-500', count: 'bg-purple-100 text-purple-600' },
  'Em elaboração do relatório': { header: 'bg-cyan-50 border-cyan-200',    title: 'text-cyan-700',   dot: 'bg-cyan-500',   count: 'bg-cyan-100 text-cyan-600' },
  'Finalizada':                 { header: 'bg-green-50 border-green-200',  title: 'text-green-700',  dot: 'bg-green-500',  count: 'bg-green-100 text-green-600' },
  'Cancelada':                  { header: 'bg-red-50 border-red-200',      title: 'text-red-700',    dot: 'bg-red-500',    count: 'bg-red-100 text-red-600' },
};

function makeCard(r) {
  const pColor = PRIO_COLORS[r.prioridade] || 'bg-gray-100 text-gray-700 border-gray-200';
  const atrasado = isAtrasada(r);
  return `
    <div class="kanban-card rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-all cursor-grab active:cursor-grabbing" draggable="true" data-id="${r.nSolicitacao}">
      <div class="flex items-start justify-between mb-2 gap-2">
        <span class="text-xs font-bold text-blue-600 dark:text-blue-400">${r.nSolicitacao}</span>
        <span class="inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium border ${pColor} flex-shrink-0">${r.prioridade}</span>
      </div>
      <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1 leading-tight">${r.equipamento}</p>
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-3 truncate">${r.cliente}</p>
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-500 dark:text-gray-400 truncate">${r.responsavel.replace(/^(Dr\.|Eng\.)\s/,'')}</span>
        <span class="text-xs ${atrasado ? 'text-orange-600 font-semibold' : 'text-gray-400'}">${formatDate(r.previsao)}${atrasado ? ' ⚠️' : ''}</span>
      </div>
    </div>`;
}

function renderKanban(data) {
  const board = document.getElementById('kanban-board');
  if (!board) return;
  const cols = getKanbanColumns(data);

  board.innerHTML = Object.entries(cols).map(([status, items]) => {
    const style = COL_STYLE[status] || { header: 'bg-gray-50 border-gray-200', title: 'text-gray-700', dot: 'bg-gray-500', count: 'bg-gray-100 text-gray-600' };
    return `
      <div class="kanban-column flex flex-col min-w-[260px] max-w-[280px] flex-shrink-0" data-status="${status}">
        <div class="flex items-center justify-between rounded-t-xl border ${style.header} px-3 py-2.5 mb-2">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full ${style.dot}"></span>
            <span class="text-sm font-semibold ${style.title}">${status}</span>
          </div>
          <span class="rounded-full px-2 py-0.5 text-xs font-bold ${style.count}">${items.length}</span>
        </div>
        <div class="kanban-drop-zone flex flex-col gap-2 min-h-[80px] rounded-b-xl p-1" data-status="${status}">
          ${items.map(r => makeCard(r)).join('')}
        </div>
      </div>`;
  }).join('');

  initDragDrop(data);
}

function initDragDrop(data) {
  let dragCard = null;
  let dragId = null;

  document.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragCard = card;
      dragId = card.dataset.id;
      card.classList.add('opacity-50');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => { card.classList.remove('opacity-50'); dragCard = null; });
  });

  document.querySelectorAll('.kanban-drop-zone').forEach(zone => {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('bg-gray-100', 'dark:bg-gray-700/40'); });
    zone.addEventListener('dragleave', () => { zone.classList.remove('bg-gray-100', 'dark:bg-gray-700/40'); });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('bg-gray-100', 'dark:bg-gray-700/40');
      if (!dragCard || !dragId) return;
      const newStatus = zone.dataset.status;
      const record = data.find(d => d.nSolicitacao === dragId);
      if (record) {
        const oldStatus = record.status;
        record.status = newStatus;
        zone.appendChild(dragCard);
        dragCard.classList.remove('opacity-50');

        showToast(`"${dragId}" movido para "${newStatus}"`);
        updateColumnCounts();
      }
    });
  });
}

function updateColumnCounts() {
  document.querySelectorAll('.kanban-column').forEach(col => {
    const status = col.dataset.status;
    const count = col.querySelectorAll('.kanban-card').length;
    const badge = col.querySelector('.kanban-drop-zone').previousElementSibling.querySelector('span:last-child');
    if (badge) badge.textContent = count;
  });
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'fixed bottom-6 right-6 z-99999 rounded-lg bg-gray-900 text-white px-4 py-3 text-sm shadow-lg dark:bg-white dark:text-gray-900 transition-all';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

export async function initKanban() {
  const data = await fetchData();
  renderKanban(data);
  startAutoRefresh((fresh) => renderKanban(fresh));
}
