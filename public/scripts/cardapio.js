// server.js COMPLETO E ATUALIZADO
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import dotenv from "dotenv";
dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", "./views");
// Pasta pública para CSS, JS e imagens
app.use(express.static(path.join(__dirname, 'public')));

// --- ROTAS ---

app.get('/', (req, res) => {
    res.render('loginEregistro'); // Primeira página
});

// === ROTA PRINCIPAL ALTERADA ===
app.get('/cardapio', async (req, res) => {
  try {
    // 1. Busca Categorias, Produtos e Tamanhos (Query Original)
    const [rows] = await pool.query(`
      SELECT 
        c.id AS categoria_id,
        c.nome AS categoria,
        p.id AS produto_id,
        p.nome AS produto,
        p.descricao,
        t.nome AS tamanho,
        pt.preco
      FROM categorias c
      LEFT JOIN produtos p ON p.categoria_id = c.id
      LEFT JOIN produtos_tamanhos pt ON pt.produto_id = p.id
      LEFT JOIN tamanhos t ON t.id = pt.tamanho_id
      ORDER BY c.id, p.id;
    `);

    // 2. NOVA BUSCA: Pega todos os adicionais do banco
    // (Lembre-se de ter criado a tabela 'adicionais' no MySQL antes!)
    let rowsAdicionais = [];
    try {
        const [result] = await pool.query(`SELECT * FROM adicionais`);
        rowsAdicionais = result;
    } catch (e) {
        console.warn("Tabela 'adicionais' não encontrada ou vazia. Ignorando adicionais.");
    }

    // 3. AGRUPAR DADOS (Monta a estrutura JSON)
    const categorias = [];

    rows.forEach(r => {
      // Tenta achar a categoria já criada no array
      let cat = categorias.find(c => c.id === r.categoria_id);
      
      if (!cat) {
        // Se não achou, cria a categoria nova
        // E aqui INJETAMOS os adicionais dela
        const adicionaisDaCategoria = rowsAdicionais.filter(a => a.categoria_id === r.categoria_id);

        cat = { 
            id: r.categoria_id, 
            nome: r.categoria, 
            produtos: [],
            adicionais: adicionaisDaCategoria // <--- Campo Novo
        };
        categorias.push(cat);
      }

      // Adiciona o produto se existir
      if (r.produto_id) {
        let prod = cat.produtos.find(p => p.id === r.produto_id);
        if (!prod) {
          prod = { id: r.produto_id, nome: r.produto, descricao: r.descricao, opcoes: [] };
          cat.produtos.push(prod);
        }

        // Adiciona o tamanho/preço se existir
        if (r.tamanho && r.preco != null) {
          prod.opcoes.push({ tamanho: r.tamanho, preco: r.preco });
        }
      }
    });

    res.render("cardapio", { categorias });

  } catch (err) {
    console.error("Erro na rota /cardapio:", err);
    res.status(500).send("Erro no servidor ao carregar cardápio");
  }
});

// --- OUTRAS ROTAS (Mantidas iguais) ---

app.post('/inicial', (req, res) => {
    res.render('inicial');
});

app.get('/inicial', (req, res) => {
  res.render('inicial');
});

app.get('/perfil', (req, res) => {
    res.render('perfil');
});

app.get("/fila-pedidos", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, c.nome AS nome_cliente
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id
    `);

     const pedidosFormatados = rows.map(p => {
      const data = new Date(p.data_pedido);
      const dia = String(data.getDate()).padStart(2, '0');
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const ano = data.getFullYear();
      const hora = String(data.getHours()).padStart(2, '0');
      const min = String(data.getMinutes()).padStart(2, '0');
      return {
        ...p,
        data_pedido: `${dia}/${mes}/${ano} ${hora}:${min}`
      };
    });
    res.render("fila-pedidos", { pedidos: pedidosFormatados });
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    res.status(500).send("Erro ao buscar pedidos");
  }
});

app.get("/lista-clientes", async (req, res) => {
  try{
    const [rows] = await pool.query('SELECT * FROM clientes');
    res.render("lista-clientes", {clientes: rows});
  } catch (err) {
    console.error("Erro ao buscar clientes:", err);
    res.status(500).send("Erro ao buscar clientes");
  }
});

app.post('/atualizar-status', async (req, res) => {
  try {
    const { id, novo_status } = req.body;
    if (!id || !novo_status) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    const [result] = await pool.query(
      'UPDATE pedidos SET status = ? WHERE id = ?',
      [novo_status, id]
    );
    res.json({ sucesso: true, linhasAfetadas: result.affectedRows });
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/editar-pedido", async (req, res) => {
  const { id, valor } = req.body;
  try {
    const [result] = await pool.query(
      "UPDATE pedidos SET valor = ? WHERE id = ?",
      [valor, id]
    );
    res.json({ ok: true, msg: "Valor atualizado!", linhas: result.affectedRows });
  } catch (erro) {
    console.error("Erro ao editar pedido:", erro);
    res.status(500).json({ ok: false, erro: "Erro no servidor" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});