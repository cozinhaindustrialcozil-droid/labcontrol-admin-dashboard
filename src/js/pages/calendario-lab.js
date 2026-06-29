import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { fetchData, formatDate, startAutoRefresh } from '../lab-data.js';

const PRIO_COLOR = { 'Urgente': '#F97316', 'Alta': '#EF4444', 'Média': '#3B82F6', 'Baixa': '#22C55E' };

function buildEvents(data) {
  return data
    .filter(r => r.previsao)
    .map(r => ({
      id: r.nSolicitacao,
      title: `${r.nSolicitacao} - ${r.equipamento}`,
      date: r.previsao,
      color: ['Finalizada','Cancelada'].includes(r.status) ? '#9CA3AF' : (PRIO_COLOR[r.prioridade] || '#3B82F6'),
      extendedProps: r,
    }));
}

function renderProximas(data) {
  const el = document.getElementById('proximas-devolutivas');
  if (!el) return;
  const hoje = new Date();
  const proximas = data
    .filter(r => r.previsao && !['Finalizada','Cancelada'].includes(r.status))
    .sort((a,b) => new Date(a.previsao) - new Date(b.previsao))
    .slice(0, 6);

  el.innerHTML = proximas.length ? proximas.map(r => {
    const dias = Math.ceil((new Date(r.previsao) - hoje) / 86400000);
    const cor = dias < 0 ? 'text-red-600' : dias <= 3 ? 'text-orange-600' : 'text-gray-700 dark:text-gray-300';
    const bg = dias < 0 ? 'bg-red-50 border-red-200' : dias <= 3 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700';
    return `
      <div class="rounded-lg border ${bg} p-2.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-blue-600 dark:text-blue-400">${r.nSolicitacao}</span>
          <span class="text-xs font-semibold ${cor}">${dias < 0 ? `${Math.abs(dias)}d atraso` : dias === 0 ? 'Hoje' : `${dias}d`}</span>
        </div>
        <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">${r.equipamento}</p>
        <p class="text-xs text-gray-500 dark:text-gray-500">${formatDate(r.previsao)}</p>
      </div>`;
  }).join('') : '<p class="text-sm text-gray-400">Nenhuma devolutiva pendente</p>';
}

export async function initCalendarioLab() {
  const data = await fetchData();
  const el = document.getElementById('calendar-lab');
  if (!el) return;

  const calendar = new Calendar(el, {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: 'pt-br',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek',
    },
    events: buildEvents(data),
    eventClick: ({ event }) => {
      const r = event.extendedProps;
      alert(`${r.nSolicitacao}\nCliente: ${r.cliente}\nEquipamento: ${r.equipamento}\nStatus: ${r.status}\nResponsável: ${r.responsavel}`);
    },
    height: 'auto',
  });

  calendar.render();
  renderProximas(data);
  startAutoRefresh((fresh) => {
    calendar.removeAllEvents();
    calendar.addEventSource(buildEvents(fresh));
    renderProximas(fresh);
  });
}
