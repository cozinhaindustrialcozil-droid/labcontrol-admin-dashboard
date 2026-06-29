import "jsvectormap/dist/jsvectormap.min.css";
import "flatpickr/dist/flatpickr.min.css";
import "../css/style.css";

import Alpine from "alpinejs";
import persist from "@alpinejs/persist";

Alpine.plugin(persist);
window.Alpine = Alpine;
Alpine.start();

// Detect page by body attribute or URL
function getPage() {
  const body = document.querySelector('body[x-data]');
  if (body) {
    const xdata = body.getAttribute('x-data') || '';
    const match = xdata.match(/page:\s*'([^']+)'/);
    if (match) return match[1];
  }
  const path = window.location.pathname;
  if (path.includes('solicitacoes')) return 'solicitacoes';
  if (path.includes('kanban')) return 'kanban';
  if (path.includes('indicadores')) return 'indicadores';
  if (path.includes('relatorios')) return 'relatorios';
  if (path.includes('calendario')) return 'calendario';
  if (path.includes('configuracoes')) return 'configuracoes';
  return 'dashboard';
}

document.addEventListener("DOMContentLoaded", async () => {
  const page = getPage();

  try {
    if (page === 'dashboard') {
      const { initDashboard } = await import('./pages/dashboard.js');
      await initDashboard();

    } else if (page === 'solicitacoes') {
      const { initSolicitacoes } = await import('./pages/solicitacoes.js');
      await initSolicitacoes();

    } else if (page === 'kanban') {
      const { initKanban } = await import('./pages/kanban.js');
      await initKanban();

    } else if (page === 'indicadores') {
      const { initIndicadores } = await import('./pages/indicadores.js');
      await initIndicadores();

    } else if (page === 'relatorios') {
      const { initRelatorios } = await import('./pages/relatorios.js');
      await initRelatorios();

    } else if (page === 'calendario') {
      const { initCalendarioLab } = await import('./pages/calendario-lab.js');
      await initCalendarioLab();

    } else if (page === 'configuracoes') {
      const { initConfiguracoes } = await import('./pages/configuracoes-lab.js');
      await initConfiguracoes();
    }
  } catch (err) {
    console.error('[LabControl] Erro ao inicializar página:', page, err);
  }

  // Search focus shortcut
  const searchInput = document.getElementById("search-input");
  const searchButton = document.getElementById("search-button");
  if (searchInput && searchButton) {
    searchButton.addEventListener("click", () => searchInput.focus());
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchInput.focus(); }
      if (e.key === "/" && document.activeElement !== searchInput) { e.preventDefault(); searchInput.focus(); }
    });
  }

  // Year in footer
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
