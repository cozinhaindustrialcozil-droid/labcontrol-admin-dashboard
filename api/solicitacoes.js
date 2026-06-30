const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

// Cache em memória (válido durante a vida do serverless instance)
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const FIELD_MAP = {
  'carimbo_de_data_hora': 'carimbo',
  'data_da_solicitacao': 'datasolicitacao',
  'n_solicitacao': 'nSolicitacao',
  'numero': 'nSolicitacao',
  'nome_do_solicitante': 'solicitante',
  'nome_do_cliente': 'cliente',
  'setor_solicitante': 'setor',
  'descricao_tipo_de_equipamento': 'equipamento',
  'descricao__tipo_de_equipamento': 'equipamento',
  'codigo_do_produto_componente': 'codigo',
  'numero_de_serie': 'serie',
  'objetivo_do_teste': 'objetivo',
  'resultado_esperado': 'resultadoEsperado',
  'motivo_da_solicitacao': 'motivo',
  'prioridade': 'prioridade',
  'previsao_de_devolutiva': 'previsao',
  'fotos_do_equipamento': 'fotos',
  'documentos_complementares': 'documentos',
  'status': 'status',
  'responsavel_tecnico': 'responsavel',
  'conclusao_tecnica': 'conclusao',
  'melhorias_identificadas': 'melhorias',
  'data_de_finalizacao': 'dataFinalizacao',
  // aliases comuns
  'cliente': 'cliente',
  'setor': 'setor',
  'equipamento': 'equipamento',
  'serie': 'serie',
  'objetivo': 'objetivo',
  'responsavel': 'responsavel',
  'conclusao': 'conclusao',
};

function normalizeHeader(h) {
  return h.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

async function getSheetData() {
  const now = Date.now();
  if (_cache && (now - _cacheTime) < CACHE_TTL) {
    return _cache;
  }

  const auth = new google.auth.JWT(
    CLIENT_EMAIL,
    null,
    PRIVATE_KEY,
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
  );

  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'A:Z',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);

  const data = rows.slice(1)
    .filter(row => row.some(cell => cell && cell.trim()))
    .map((row, idx) => {
      const obj = { _rowIndex: idx + 2 };
      headers.forEach((h, i) => {
        const field = FIELD_MAP[h] || h;
        obj[field] = row[i] ? row[i].trim() : '';
      });
      if (!obj.nSolicitacao) {
        obj.nSolicitacao = `SOL-${String(idx + 1).padStart(3, '0')}`;
      }
      return obj;
    });

  _cache = data;
  _cacheTime = now;
  return data;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    return res.status(500).json({
      ok: false,
      error: 'Credenciais do Google Sheets não configuradas. Verifique as variáveis de ambiente GOOGLE_SHEET_ID, GOOGLE_CLIENT_EMAIL e GOOGLE_PRIVATE_KEY.',
    });
  }

  try {
    const data = await getSheetData();
    return res.status(200).json({
      ok: true,
      data,
      total: data.length,
      updatedAt: new Date().toISOString(),
      source: 'google_sheets',
    });
  } catch (err) {
    console.error('[API] Erro ao ler planilha:', err.message);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
};
