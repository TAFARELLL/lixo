const http = require('http');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase com a chave correta
const supabaseUrl = 'https://yutvabwyvzrcysisxqaz.supabase.co';
const supabaseKey = 'sb_publishable_kwS_CozQjcJLZjBjeZZXQA_E0NrbWDI'; 
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. LISTA DE PROFESSORES E SENHAS
const PROFESSORES = {
  'Dimas': 'sacolao',
  'Prof. Mariana': 'alfabeto',
  'Prof. Geovanna': 'gatos',
  'Adriano': 'switch'
};

const LIMITE_LANCAMENTO_MIN = -10;
const LIMITE_LANCAMENTO_MAX = 10;
const LIMITE_TOTAL_MIN = -100;
const LIMITE_TOTAL_MAX = 500;

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // Entrega o arquivo CSS
  if (req.url === '/style.css' && req.method === 'GET') {
    const caminho = path.join(__dirname, 'style.css');
    fs.readFile(caminho, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('CSS não encontrado');
      }
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
      res.end(data);
    });

  // Página dos Alunos (Rota principal "/")
  } else if ((req.url === '/' || req.url === '/alunos') && req.method === 'GET') {
    const caminho = path.join(__dirname, 'alunos.html');
    fs.readFile(caminho, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Erro ao carregar alunos.html');
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });

  // Página dos Professores
  } else if (req.url === '/professor' && req.method === 'GET') {
    const caminho = path.join(__dirname, 'professor.html');
    fs.readFile(caminho, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Erro ao carregar professor.html');
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });

  // Retorna o histórico de alterações do Supabase
  } else if (req.url === '/api/historico' && req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('historico')
        .select('*')
        .order('id', { ascending: false })
        .limit(15);
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data || []));
    } catch (e) {
      console.error("Erro ao buscar histórico:", e);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify([]));
    }

  // Apaga um item específico do histórico (RESTRITO APENAS AO ADRIANO)
  } else if (req.url.startsWith('/api/historico/') && req.method === 'DELETE') {
    const idItem = req.url.split('/')[3];
    let corpo = '';
    req.on('data', p => { corpo += p; });
    req.on('end', async () => {
      try {
        const { senha } = JSON.parse(corpo);

        if (senha !== PROFESSORES['Adriano']) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Acesso negado! Apenas o Adriano pode apagar itens do histórico.');
        }

        const { error } = await supabase
          .from('historico')
          .delete()
          .eq('id', idItem);

        if (error) throw error;

        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Item do histórico apagado com sucesso pelo Adriano!');
      } catch (e) {
        console.error("Erro ao apagar item do histórico:", e);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Erro ao apagar o item no banco.');
      }
    });

  // Retorna as notas do Banco de Dados (Supabase)
  } else if (req.url === '/api/notas' && req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('notas').select('*');
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data || []));
    } catch (e) {
      console.error("Erro ao buscar notas:", e);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify([]));
    }

  // Salva as notas e registra o histórico no Supabase
  } else if (req.url === '/api/notas' && req.method === 'POST') {
    let corpo = '';
    req.on('data', p => { corpo += p; });
    req.on('end', async () => {
      try {
        const pedido = JSON.parse(corpo);

        const entradaProf = Object.entries(PROFESSORES).find(([nome, s]) => s === pedido.senha);
        if (!entradaProf) {
          res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Senha incorreta!');
        }

        if (pedido.acao !== 'exclusao' && pedido.pontosAlterados !== undefined) {
          const ptsLancados = Number(pedido.pontosAlterados);
          if (ptsLancados < LIMITE_LANCAMENTO_MIN || ptsLancados > LIMITE_LANCAMENTO_MAX) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end(`Cada lançamento deve ser entre ${LIMITE_LANCAMENTO_MIN} e +${LIMITE_LANCAMENTO_MAX} pontos.`);
          }
        }

        for (const item of pedido.lista) {
          if (item.pontos < LIMITE_TOTAL_MIN || item.pontos > LIMITE_TOTAL_MAX) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end(`A sala ${item.sala} não pode ultrapassar os limites.`);
          }
        }

        const nomeProfessor = entradaProf[0];
        const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        for (const item of pedido.lista) {
          const { error: errUpsert } = await supabase
            .from('notas')
            .upsert({ sala: item.sala, pontos: item.pontos }, { onConflict: 'sala' });

          if (errUpsert) throw errUpsert;
        }

        if (pedido.pontosAlterados !== undefined && pedido.salaModificada) {
          await supabase.from('historico').insert({
            professor: nomeProfessor,
            sala: pedido.salaModificada,
            pontos_alterados: pedido.pontosAlterados,
            motivo: pedido.motivo || 'Lançamento de pontos',
            data_hora: dataHora
          });
        }

        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Olá, ${nomeProfessor}! Salvo com sucesso em ${dataHora}.`);
      } catch (e) {
        console.error("ERRO DETALHADO DO SUPABASE:", e);
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Erro ao salvar os dados no banco.');
      }
    });

  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Página não encontrada');
  }
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});