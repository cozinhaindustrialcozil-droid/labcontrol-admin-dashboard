import { fetchData } from '../lab-data.js';

export async function initConfiguracoes() {
  const data = await fetchData();
  const el = document.getElementById('cfg-total');
  if (el) el.textContent = data.length;
  const elUpd = document.getElementById('cfg-update');
  if (elUpd) elUpd.textContent = new Date().toLocaleTimeString('pt-BR');

  document.getElementById('btn-testar-conexao')?.addEventListener('click', async (btn) => {
    const statusEl = document.getElementById('conexao-status');
    const id = document.getElementById('sheets-id')?.value;
    if (!id) {
      if (statusEl) { statusEl.className = 'rounded-lg p-3 text-sm bg-yellow-50 text-yellow-700 border border-yellow-200'; statusEl.textContent = '⚠ Informe o ID da planilha para testar a conexão.'; statusEl.classList.remove('hidden'); }
      return;
    }
    if (statusEl) { statusEl.className = 'rounded-lg p-3 text-sm bg-blue-50 text-blue-700 border border-blue-200'; statusEl.textContent = 'Testando conexão com Google Sheets...'; statusEl.classList.remove('hidden'); }
    await new Promise(r => setTimeout(r, 1200));
    if (statusEl) { statusEl.className = 'rounded-lg p-3 text-sm bg-green-50 text-green-700 border border-green-200'; statusEl.textContent = `✓ Conexão bem-sucedida! Planilha encontrada com ${data.length} registros (modo demo).`; }
  });

  document.getElementById('btn-salvar-config')?.addEventListener('click', () => {
    const config = {
      sheetsId: document.getElementById('sheets-id')?.value,
      sheetsTab: document.getElementById('sheets-tab')?.value,
      interval: document.getElementById('refresh-interval')?.value,
    };
    localStorage.setItem('labcontrol_config', JSON.stringify(config));
    const statusEl = document.getElementById('conexao-status');
    if (statusEl) { statusEl.className = 'rounded-lg p-3 text-sm bg-green-50 text-green-700 border border-green-200'; statusEl.textContent = '✓ Configurações salvas com sucesso!'; statusEl.classList.remove('hidden'); }
    setTimeout(() => statusEl?.classList.add('hidden'), 3000);
  });

  const saved = localStorage.getItem('labcontrol_config');
  if (saved) {
    try {
      const cfg = JSON.parse(saved);
      if (cfg.sheetsId && document.getElementById('sheets-id')) document.getElementById('sheets-id').value = cfg.sheetsId;
      if (cfg.sheetsTab && document.getElementById('sheets-tab')) document.getElementById('sheets-tab').value = cfg.sheetsTab;
      if (cfg.interval && document.getElementById('refresh-interval')) document.getElementById('refresh-interval').value = cfg.interval;
    } catch(e) {}
  }
}
