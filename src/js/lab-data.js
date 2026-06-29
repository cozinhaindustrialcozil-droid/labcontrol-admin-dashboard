/**
 * LabControl - Serviço de dados
 * Simula integração com Google Sheets com dados realistas
 * Em produção: substituir fetchFromGoogleSheets() com a API real
 */

const LAB_DATA_KEY = 'labcontrol_data';
const LAB_DATA_TIMESTAMP_KEY = 'labcontrol_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const STATUS_COLORS = {
  'Aberta':                     { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500',   hex: '#3B82F6' },
  'Em análise':                 { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', hex: '#EAB308' },
  'Aguardando material':        { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', hex: '#F97316' },
  'Em teste':                   { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', hex: '#A855F7' },
  'Em elaboração do relatório': { bg: 'bg-cyan-100',   text: 'text-cyan-700',   dot: 'bg-cyan-500',   hex: '#06B6D4' },
  'Finalizada':                 { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500',  hex: '#22C55E' },
  'Cancelada':                  { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500',    hex: '#EF4444' },
};

export const PRIORIDADE_COLORS = {
  'Alta':   { bg: 'bg-red-100',    text: 'text-red-700',    hex: '#EF4444' },
  'Média':  { bg: 'bg-yellow-100', text: 'text-yellow-700', hex: '#EAB308' },
  'Baixa':  { bg: 'bg-green-100',  text: 'text-green-700',  hex: '#22C55E' },
  'Urgente':{ bg: 'bg-rose-100',   text: 'text-rose-700',   hex: '#F43F5E' },
};

const SAMPLE_DATA = [
  { nSolicitacao:'SOL-2024-001', datasolicitacao:'2024-01-08', carimbo:'2024-01-08 08:30', solicitante:'Carlos Mendes', cliente:'Petrobras S.A.', setor:'Manutenção', equipamento:'Bomba Centrífuga', codigo:'EQ-BC-001', serie:'SN-44512', objetivo:'Análise de vibração', resultadoEsperado:'Dentro da norma ISO 10816', motivo:'Manutenção preventiva', prioridade:'Alta', previsao:'2024-01-22', status:'Finalizada', responsavel:'Dr. Ana Lima', conclusao:'Aprovado. Vibração dentro dos limites.', melhorias:'Substituição de rolamento em 6 meses', dataFinalizacao:'2024-01-20' },
  { nSolicitacao:'SOL-2024-002', datasolicitacao:'2024-01-12', carimbo:'2024-01-12 09:15', solicitante:'Fernanda Costa', cliente:'Vale S.A.', setor:'Engenharia', equipamento:'Motor Elétrico 75kW', codigo:'EQ-ME-075', serie:'SN-88230', objetivo:'Teste de isolamento', resultadoEsperado:'Resistência > 100MΩ', motivo:'Inspeção periódica', prioridade:'Média', previsao:'2024-01-26', status:'Finalizada', responsavel:'Eng. João Silva', conclusao:'Aprovado. Isolamento adequado.', melhorias:'Nenhuma', dataFinalizacao:'2024-01-24' },
  { nSolicitacao:'SOL-2024-003', datasolicitacao:'2024-01-18', carimbo:'2024-01-18 14:00', solicitante:'Ricardo Alves', cliente:'Embraer', setor:'Produção', equipamento:'Redutor Industrial', codigo:'EQ-RI-003', serie:'SN-11099', objetivo:'Análise de óleo', resultadoEsperado:'Contaminação < 0.1%', motivo:'Anomalia detectada', prioridade:'Urgente', previsao:'2024-01-25', status:'Finalizada', responsavel:'Dr. Ana Lima', conclusao:'Reprovado. Contaminação detectada.', melhorias:'Troca imediata do óleo', dataFinalizacao:'2024-01-23' },
  { nSolicitacao:'SOL-2024-004', datasolicitacao:'2024-02-03', carimbo:'2024-02-03 10:30', solicitante:'Mariana Roque', cliente:'Gerdau', setor:'Qualidade', equipamento:'Compressor de Ar', codigo:'EQ-CA-004', serie:'SN-77341', objetivo:'Teste de pressão', resultadoEsperado:'Pressão estável 8 bar', motivo:'Certificação ISO', prioridade:'Alta', previsao:'2024-02-17', status:'Finalizada', responsavel:'Eng. João Silva', conclusao:'Aprovado.', melhorias:'Ajuste do regulador', dataFinalizacao:'2024-02-15' },
  { nSolicitacao:'SOL-2024-005', datasolicitacao:'2024-02-10', carimbo:'2024-02-10 08:00', solicitante:'Paulo Souza', cliente:'Petrobras S.A.', setor:'Manutenção', equipamento:'Válvula de Controle', codigo:'EQ-VC-005', serie:'SN-33210', objetivo:'Teste de estanqueidade', resultadoEsperado:'Zero vazamento', motivo:'Inspeção programada', prioridade:'Média', previsao:'2024-02-24', status:'Finalizada', responsavel:'Dr. Ana Lima', conclusao:'Aprovado.', melhorias:'Nenhuma', dataFinalizacao:'2024-02-22' },
  { nSolicitacao:'SOL-2024-006', datasolicitacao:'2024-02-20', carimbo:'2024-02-20 11:45', solicitante:'Juliana Ferreira', cliente:'WEG S.A.', setor:'P&D', equipamento:'Gerador 500kVA', codigo:'EQ-GE-500', serie:'SN-99001', objetivo:'Teste de carga', resultadoEsperado:'Eficiência > 95%', motivo:'Homologação produto', prioridade:'Alta', previsao:'2024-03-05', status:'Finalizada', responsavel:'Eng. João Silva', conclusao:'Aprovado. Eficiência 96.2%.', melhorias:'Nenhuma', dataFinalizacao:'2024-03-04' },
  { nSolicitacao:'SOL-2024-007', datasolicitacao:'2024-03-05', carimbo:'2024-03-05 09:00', solicitante:'Roberto Lima', cliente:'Usiminas', setor:'Manutenção', equipamento:'Ponte Rolante 20t', codigo:'EQ-PR-020', serie:'SN-55667', objetivo:'Teste de carga estática', resultadoEsperado:'Sem deformação permanente', motivo:'NR-11 obrigatório', prioridade:'Urgente', previsao:'2024-03-12', status:'Finalizada', responsavel:'Dr. Ana Lima', conclusao:'Aprovado.', melhorias:'Revisão dos cabos de aço', dataFinalizacao:'2024-03-11' },
  { nSolicitacao:'SOL-2024-008', datasolicitacao:'2024-03-14', carimbo:'2024-03-14 15:30', solicitante:'Amanda Barros', cliente:'Embraer', setor:'Engenharia', equipamento:'Atuador Hidráulico', codigo:'EQ-AH-008', serie:'SN-12344', objetivo:'Análise de fadiga', resultadoEsperado:'Vida útil > 10.000 ciclos', motivo:'Desenvolvimento produto', prioridade:'Alta', previsao:'2024-04-01', status:'Finalizada', responsavel:'Eng. João Silva', conclusao:'Aprovado. 12.500 ciclos.', melhorias:'Nenhuma', dataFinalizacao:'2024-03-30' },
  { nSolicitacao:'SOL-2024-009', datasolicitacao:'2024-03-22', carimbo:'2024-03-22 10:00', solicitante:'Carlos Mendes', cliente:'Vale S.A.', setor:'Produção', equipamento:'Esteira Transportadora', codigo:'EQ-ET-009', serie:'SN-88891', objetivo:'Análise de tensão', resultadoEsperado:'Tensão < limite admissível', motivo:'Aumento de carga operacional', prioridade:'Média', previsao:'2024-04-05', status:'Finalizada', responsavel:'Dr. Ana Lima', conclusao:'Aprovado com restrições.', melhorias:'Reforço estrutural recomendado', dataFinalizacao:'2024-04-04' },
  { nSolicitacao:'SOL-2024-010', datasolicitacao:'2024-04-02', carimbo:'2024-04-02 08:30', solicitante:'Fernanda Costa', cliente:'Gerdau', setor:'Qualidade', equipamento:'Trocador de Calor', codigo:'EQ-TC-010', serie:'SN-77002', objetivo:'Eficiência térmica', resultadoEsperado:'Δt > 15°C', motivo:'Otimização energética', prioridade:'Baixa', previsao:'2024-04-20', status:'Finalizada', responsavel:'Eng. João Silva', conclusao:'Aprovado.', melhorias:'Limpeza semestral', dataFinalizacao:'2024-04-18' },
  { nSolicitacao:'SOL-2024-011', datasolicitacao:'2024-04-15', carimbo:'2024-04-15 13:00', solicitante:'Mariana Roque', cliente:'WEG S.A.', setor:'P&D', equipamento:'Inversor de Frequência', codigo:'EQ-IF-011', serie:'SN-44100', objetivo:'Teste EMC', resultadoEsperado:'Conformidade IEC 61000', motivo:'Certificação CE', prioridade:'Alta', previsao:'2024-05-01', status:'Finalizada', responsavel:'Dr. Ana Lima', conclusao:'Aprovado.', melhorias:'Nenhuma', dataFinalizacao:'2024-04-29' },
  { nSolicitacao:'SOL-2024-012', datasolicitacao:'2024-04-28', carimbo:'2024-04-28 09:45', solicitante:'Paulo Souza', cliente:'Petrobras S.A.', setor:'Manutenção', equipamento:'Bomba de Vácuo', codigo:'EQ-BV-012', serie:'SN-33450', objetivo:'Taxa de bombeamento', resultadoEsperado:'> 500 m³/h', motivo:'Auditoria interna', prioridade:'Média', previsao:'2024-05-12', status:'Finalizada', responsavel:'Eng. João Silva', conclusao:'Aprovado.', melhorias:'Nenhuma', dataFinalizacao:'2024-05-10' },
  { nSolicitacao:'SOL-2024-013', datasolicitacao:'2024-05-06', carimbo:'2024-05-06 14:15', solicitante:'Juliana Ferreira', cliente:'Embraer', setor:'Engenharia', equipamento:'Sistema de Freio', codigo:'EQ-SF-013', serie:'SN-11200', objetivo:'Desempenho de frenagem', resultadoEsperado:'Parada em < 50m', motivo:'Desenvolvimento produto', prioridade:'Urgente', previsao:'2024-05-20', status:'Finalizada', responsavel:'Dr. Ana Lima', conclusao:'Aprovado.', melhorias:'Ajuste na dosagem hidráulica', dataFinalizacao:'2024-05-18' },
  { nSolicitacao:'SOL-2024-014', datasolicitacao:'2024-05-20', carimbo:'2024-05-20 10:30', solicitante:'Roberto Lima', cliente:'Usiminas', setor:'Produção', equipamento:'Forno Industrial', codigo:'EQ-FI-014', serie:'SN-66780', objetivo:'Uniformidade térmica', resultadoEsperado:'ΔT < 5°C câmara', motivo:'Qualidade processo', prioridade:'Alta', previsao:'2024-06-03', status:'Finalizada', responsavel:'Eng. João Silva', conclusao:'Aprovado. ΔT = 3.8°C.', melhorias:'Nenhuma', dataFinalizacao:'2024-06-01' },
  { nSolicitacao:'SOL-2024-015', datasolicitacao:'2024-06-03', carimbo:'2024-06-03 08:00', solicitante:'Amanda Barros', cliente:'Vale S.A.', setor:'Manutenção', equipamento:'Britador de Mandíbulas', codigo:'EQ-BM-015', serie:'SN-99321', objetivo:'Análise estrutural', resultadoEsperado:'Sem trincas críticas', motivo:'Inspeção preditiva', prioridade:'Alta', previsao:'2024-06-17', status:'Finalizada', responsavel:'Dr. Ana Lima', conclusao:'Aprovado com ressalvas.', melhorias:'Reparo de solda indicado', dataFinalizacao:'2024-06-15' },
  { nSolicitacao:'SOL-2024-016', datasolicitacao:'2024-06-12', carimbo:'2024-06-12 09:30', solicitante:'Carlos Mendes', cliente:'Gerdau', setor:'Qualidade', equipamento:'Medidor de Fluxo', codigo:'EQ-MF-016', serie:'SN-22301', objetivo:'Calibração e acurácia', resultadoEsperado:'Erro < ±0.5%', motivo:'Rastreabilidade metrológica', prioridade:'Média', previsao:'2024-06-26', status:'Finalizada', responsavel:'Eng. João Silva', conclusao:'Aprovado. Erro = ±0.3%.', melhorias:'Nenhuma', dataFinalizacao:'2024-06-24' },
  { nSolicitacao:'SOL-2024-017', datasolicitacao:'2024-06-20', carimbo:'2024-06-20 11:00', solicitante:'Fernanda Costa', cliente:'WEG S.A.', setor:'P&D', equipamento:'Motor de Passo', codigo:'EQ-MP-017', serie:'SN-55100', objetivo:'Torque e velocidade', resultadoEsperado:'Torque > 50 Nm', motivo:'Novo produto', prioridade:'Alta', previsao:'2024-07-04', status:'Finalizada', responsavel:'Dr. Ana Lima', conclusao:'Aprovado.', melhorias:'Nenhuma', dataFinalizacao:'2024-07-02' },
  { nSolicitacao:'SOL-2024-018', datasolicitacao:'2024-07-08', carimbo:'2024-07-08 08:45', solicitante:'Mariana Roque', cliente:'Petrobras S.A.', setor:'Manutenção', equipamento:'Separador Centrífugo', codigo:'EQ-SC-018', serie:'SN-44900', objetivo:'Eficiência de separação', resultadoEsperado:'> 99%', motivo:'Certificação API', prioridade:'Alta', previsao:'2024-07-22', status:'Em elaboração do relatório', responsavel:'Eng. João Silva', conclusao:'', melhorias:'', dataFinalizacao:'' },
  { nSolicitacao:'SOL-2024-019', datasolicitacao:'2024-07-15', carimbo:'2024-07-15 14:00', solicitante:'Paulo Souza', cliente:'Embraer', setor:'Engenharia', equipamento:'Sensor de Pressão', codigo:'EQ-SP-019', serie:'SN-33110', objetivo:'Calibração', resultadoEsperado:'Erro < ±0.1%', motivo:'Requisito AS9100', prioridade:'Urgente', previsao:'2024-07-22', status:'Em teste', responsavel:'Dr. Ana Lima', conclusao:'', melhorias:'', dataFinalizacao:'' },
  { nSolicitacao:'SOL-2024-020', datasolicitacao:'2024-07-22', carimbo:'2024-07-22 09:00', solicitante:'Juliana Ferreira', cliente:'Vale S.A.', setor:'Produção', equipamento:'Cilindro Hidráulico', codigo:'EQ-CH-020', serie:'SN-77880', objetivo:'Teste de pressão', resultadoEsperado:'Sem vazamento a 350 bar', motivo:'Substituição após falha', prioridade:'Urgente', previsao:'2024-07-29', status:'Em teste', responsavel:'Eng. João Silva', conclusao:'', melhorias:'', dataFinalizacao:'' },
  { nSolicitacao:'SOL-2024-021', datasolicitacao:'2024-07-28', carimbo:'2024-07-28 10:15', solicitante:'Roberto Lima', cliente:'Gerdau', setor:'Qualidade', equipamento:'Analisador de Espectro', codigo:'EQ-AE-021', serie:'SN-11550', objetivo:'Verificação de calibração', resultadoEsperado:'Conformidade ABNT', motivo:'Auditoría ISO 9001', prioridade:'Alta', previsao:'2024-08-11', status:'Aguardando material', responsavel:'Dr. Ana Lima', conclusao:'', melhorias:'', dataFinalizacao:'' },
  { nSolicitacao:'SOL-2024-022', datasolicitacao:'2024-08-05', carimbo:'2024-08-05 08:30', solicitante:'Amanda Barros', cliente:'WEG S.A.', setor:'P&D', equipamento:'Controlador PID', codigo:'EQ-CP-022', serie:'SN-99010', objetivo:'Sintonização e resposta', resultadoEsperado:'Overshoot < 5%', motivo:'Desenvolvimento', prioridade:'Média', previsao:'2024-08-19', status:'Em análise', responsavel:'Eng. João Silva', conclusao:'', melhorias:'', dataFinalizacao:'' },
  { nSolicitacao:'SOL-2024-023', datasolicitacao:'2024-08-12', carimbo:'2024-08-12 13:30', solicitante:'Carlos Mendes', cliente:'Petrobras S.A.', setor:'Manutenção', equipamento:'Turbina a Vapor', codigo:'EQ-TV-023', serie:'SN-44200', objetivo:'Análise vibração palhetas', resultadoEsperado:'Conforme API 670', motivo:'Manutenção programada', prioridade:'Alta', previsao:'2024-08-26', status:'Em análise', responsavel:'Dr. Ana Lima', conclusao:'', melhorias:'', dataFinalizacao:'' },
  { nSolicitacao:'SOL-2024-024', datasolicitacao:'2024-08-19', carimbo:'2024-08-19 09:00', solicitante:'Fernanda Costa', cliente:'Usiminas', setor:'Engenharia', equipamento:'Robô Industrial ABB', codigo:'EQ-RI-024', serie:'SN-33990', objetivo:'Repetibilidade e precisão', resultadoEsperado:'Desvio < 0.02mm', motivo:'Integração linha produção', prioridade:'Alta', previsao:'2024-09-02', status:'Em análise', responsavel:'Eng. João Silva', conclusao:'', melhorias:'', dataFinalizacao:'' },
  { nSolicitacao:'SOL-2024-025', datasolicitacao:'2024-08-26', carimbo:'2024-08-26 11:00', solicitante:'Mariana Roque', cliente:'Embraer', setor:'P&D', equipamento:'Sistema de Controle Fly-by-wire', codigo:'EQ-FC-025', serie:'SN-11987', objetivo:'Redundância e segurança', resultadoEsperado:'Conformidade DO-178C', motivo:'Certificação aeronáutica', prioridade:'Urgente', previsao:'2024-09-09', status:'Aberta', responsavel:'Dr. Ana Lima', conclusao:'', melhorias:'', dataFinalizacao:'' },
  { nSolicitacao:'SOL-2024-026', datasolicitacao:'2024-09-02', carimbo:'2024-09-02 08:00', solicitante:'Paulo Souza', cliente:'Vale S.A.', setor:'Manutenção', equipamento:'Bomba de Polpa', codigo:'EQ-BP-026', serie:'SN-77100', objetivo:'Desgaste e abrasão', resultadoEsperado:'Vida útil > 2000h', motivo:'Otimização manutenção', prioridade:'Média', previsao:'2024-09-16', status:'Aberta', responsavel:'Eng. João Silva', conclusao:'', melhorias:'', dataFinalizacao:'' },
  { nSolicitacao:'SOL-2024-027', datasolicitacao:'2024-09-03', carimbo:'2024-09-03 14:00', solicitante:'Juliana Ferreira', cliente:'Gerdau', setor:'Qualidade', equipamento:'Câmera de Temperatura', codigo:'EQ-CT-027', serie:'SN-22890', objetivo:'Uniformidade imagem térmica', resultadoEsperado:'Resolução < 0.1°C', motivo:'Controle qualidade solda', prioridade:'Baixa', previsao:'2024-09-17', status:'Aberta', responsavel:'Dr. Ana Lima', conclusao:'', melhorias:'', dataFinalizacao:'' },
  { nSolicitacao:'SOL-2024-028', datasolicitacao:'2024-07-01', carimbo:'2024-07-01 10:00', solicitante:'Roberto Lima', cliente:'WEG S.A.', setor:'Engenharia', equipamento:'Transformador 500kVA', codigo:'EQ-TR-028', serie:'SN-55430', objetivo:'Perdas em vazio e carga', resultadoEsperado:'Conforme NBR 5356', motivo:'Entrega ao cliente', prioridade:'Alta', previsao:'2024-07-15', status:'Cancelada', responsavel:'Eng. João Silva', conclusao:'Cancelado por cliente.', melhorias:'', dataFinalizacao:'' },
  { nSolicitacao:'SOL-2024-029', datasolicitacao:'2024-06-01', carimbo:'2024-06-01 09:30', solicitante:'Amanda Barros', cliente:'Petrobras S.A.', setor:'Produção', equipamento:'Compressor Alternativo', codigo:'EQ-CA-029', serie:'SN-99870', objetivo:'Análise termográfica', resultadoEsperado:'Sem hot spots', motivo:'Inspeção preditiva', prioridade:'Média', previsao:'2024-06-08', status:'Cancelada', responsavel:'Dr. Ana Lima', conclusao:'Cancelado por redesign.', melhorias:'', dataFinalizacao:'' },
];

let cachedData = null;
let lastFetch = null;
let updateInterval = null;
let updateCallbacks = [];

function simulateGoogleSheetsData() {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...SAMPLE_DATA]), 300);
  });
}

export async function fetchData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedData && lastFetch && (now - lastFetch) < CACHE_DURATION) {
    return cachedData;
  }
  try {
    const data = await simulateGoogleSheetsData();
    cachedData = data;
    lastFetch = now;
    try { localStorage.setItem(LAB_DATA_KEY, JSON.stringify(data)); localStorage.setItem(LAB_DATA_TIMESTAMP_KEY, String(now)); } catch(e){}
    return data;
  } catch (err) {
    console.error('[LabControl] Erro ao buscar dados:', err);
    try {
      const saved = localStorage.getItem(LAB_DATA_KEY);
      if (saved) return JSON.parse(saved);
    } catch(e){}
    return SAMPLE_DATA;
  }
}

export function startAutoRefresh(callback) {
  if (callback) updateCallbacks.push(callback);
  if (updateInterval) return;
  updateInterval = setInterval(async () => {
    const data = await fetchData(true);
    updateCallbacks.forEach(cb => cb(data));
  }, CACHE_DURATION);
}

export function getDashboardStats(data) {
  const hoje = new Date();
  const total = data.length;
  const emAnalise = data.filter(d => d.status === 'Em análise').length;
  const emTeste = data.filter(d => d.status === 'Em teste').length;
  const finalizadas = data.filter(d => d.status === 'Finalizada').length;
  const canceladas = data.filter(d => d.status === 'Cancelada').length;
  const atrasadas = data.filter(d => {
    if (d.status === 'Finalizada' || d.status === 'Cancelada') return false;
    if (!d.previsao) return false;
    return new Date(d.previsao) < hoje;
  }).length;

  const temposMedio = data
    .filter(d => d.status === 'Finalizada' && d.datasolicitacao && d.dataFinalizacao)
    .map(d => (new Date(d.dataFinalizacao) - new Date(d.datasolicitacao)) / 86400000);
  const tempoMedio = temposMedio.length ? Math.round(temposMedio.reduce((a,b) => a+b, 0) / temposMedio.length) : 0;

  return { total, emAnalise, emTeste, finalizadas, canceladas, atrasadas, tempoMedio };
}

export function getStatusCounts(data) {
  const counts = {};
  data.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });
  return counts;
}

export function getSetorCounts(data) {
  const counts = {};
  data.forEach(d => { counts[d.setor] = (counts[d.setor] || 0) + 1; });
  return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 8);
}

export function getPrioridadeCounts(data) {
  const order = ['Urgente','Alta','Média','Baixa'];
  const counts = {};
  data.forEach(d => { counts[d.prioridade] = (counts[d.prioridade] || 0) + 1; });
  return order.map(p => ({ prioridade: p, count: counts[p] || 0 }));
}

export function getEvolucaoMensal(data) {
  const months = {};
  data.forEach(d => {
    if (!d.datasolicitacao) return;
    const dt = new Date(d.datasolicitacao);
    const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
    months[key] = (months[key] || 0) + 1;
  });
  const sorted = Object.keys(months).sort();
  const labels = sorted.map(k => {
    const [y, m] = k.split('-');
    const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${names[parseInt(m)-1]}/${y.slice(2)}`;
  });
  return { labels, values: sorted.map(k => months[k]) };
}

export function getTopClientes(data) {
  const counts = {};
  data.forEach(d => { counts[d.cliente] = (counts[d.cliente] || 0) + 1; });
  return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,10);
}

export function getTopEquipamentos(data) {
  const counts = {};
  data.forEach(d => { counts[d.equipamento] = (counts[d.equipamento] || 0) + 1; });
  return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,10);
}

export function getTempoMedioPorResponsavel(data) {
  const resp = {};
  data.filter(d => d.status === 'Finalizada' && d.datasolicitacao && d.dataFinalizacao).forEach(d => {
    const dias = (new Date(d.dataFinalizacao) - new Date(d.datasolicitacao)) / 86400000;
    if (!resp[d.responsavel]) resp[d.responsavel] = [];
    resp[d.responsavel].push(dias);
  });
  return Object.entries(resp).map(([nome, dias]) => ({
    nome, media: Math.round(dias.reduce((a,b)=>a+b,0)/dias.length), total: dias.length
  })).sort((a,b) => a.media - b.media);
}

export function getKanbanColumns(data) {
  const cols = { 'Aberta':[], 'Em análise':[], 'Aguardando material':[], 'Em teste':[], 'Em elaboração do relatório':[], 'Finalizada':[], 'Cancelada':[] };
  data.forEach(d => { if (cols[d.status]) cols[d.status].push(d); });
  return cols;
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR');
}

export function isAtrasada(row) {
  if (row.status === 'Finalizada' || row.status === 'Cancelada') return false;
  if (!row.previsao) return false;
  return new Date(row.previsao) < new Date();
}
