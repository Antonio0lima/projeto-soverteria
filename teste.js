import conexao from './db.js';

async function testarConexao() {
  try {
    const [linhas] = await conexao.query('SELECT * FROM pedidos');
    console.table(linhas);
  } catch (erro) {
    console.error('Erro ao conectar:', erro);
  }
}

testarConexao();
