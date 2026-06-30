const express = require('express');
const { google } = require('googleapis');

const app = express();
const PORT = 3001;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Suporta tanto JSON completo (GOOGLE_SERVICE_ACCOUNT_JSON) quanto vars separadas
function getCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch(e) {
      console.error('[API] Erro ao parsear GOOGLE_SERVICE_ACCOUNT_JSON:', e.message);
    }
  }
  return {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };
}

async function getSheetData() {
  const creds = getCredentials();
  const auth = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
  );

  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'A:Z',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, ''));

  const FIELD_MAP = {
    'n_solicitacao': 'nSolicitacao', 'numero': 'nSolicitacao', 'id': 'nSolicitacao',
    'data_solicitacao': 'datasolicitacao', 'data': 'datasolicitacao', 'abertura': 'datasolicitacao',
    'cliente': 'cliente', 'empresa': 'cliente',
    'setor': 'setor', 'departamento': 'setor', 'area': 'setor',
    'equipamento': 'equipamento', 'instrumento': 'equipamento', 'item': 'equipamento',
    'tipo_teste': 'tipoTeste', 'tipo': 'tipoTeste', 'ensaio': 'tipoTeste',
    'prioridade': 'prioridade', 'urgencia': 'prioridade',
    'status': 'status', 'situacao': 'status', 'etapa': 'status',
    'responsavel': 'responsavel', 'tecnico': 'responsavel', 'analista': 'responsavel',
    'previsao': 'previsao', 'prazo': 'previsao', 'data_prevista': 'previsao',
    'conclusao': 'conclusao', 'data_conclusao': 'conclusao', 'finalizado': 'conclusao',
    'observacoes': 'observacoes', 'obs': 'observacoes', 'notas': 'observacoes',
  };

  return rows.slice(1)
    .filter(row => row.some(cell => cell && cell.trim()))
    .map((row, idx) => {
      const obj = { _rowIndex: idx + 2 };
      headers.forEach((h, i) => {
        const field = FIELD_MAP[h] || h;
        obj[field] = row[i] || '';
      });
      if (!obj.nSolicitacao) obj.nSolicitacao = `SOL-${String(idx + 1).padStart(3, '0')}`;
      return obj;
    });
}

app.get('/api/solicitacoes', async (req, res) => {
  try {
    const creds = getCredentials();
    if (!SHEET_ID || !creds.client_email || !creds.private_key) {
      return res.status(500).json({ error: 'Credenciais do Google Sheets não configuradas.' });
    }
    const data = await getSheetData();
    res.json({ ok: true, data, total: data.length, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[API] Erro ao ler planilha:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, sheetId: SHEET_ID ? SHEET_ID.slice(0, 8) + '...' : 'not set' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[API] Servidor rodando na porta ${PORT}`);
  console.log(`[API] Sheet ID: ${SHEET_ID ? SHEET_ID.slice(0, 8) + '...' : 'NÃO CONFIGURADO'}`);
});
