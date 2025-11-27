// server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import dotenv from "dotenv";
import session from "express-session";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURAÇÃO DA SESSÃO ---
app.use(
  session({
    secret: "qualquercoisa-super-secreta",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 } // 1 hora
  })
);

// Middleware para disponibilizar o usuário em todas as views
app.use((req, res, next) => {
  res.locals.usuario = req.session.user || null;
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de segurança para rotas de Admin
function somenteAdmin(req, res, next) {
  if (!req.session.user || req.session.user.tipo !== "admin") {
    return res.status(403).send("Acesso negado");
  }
  next();
}

// --- ROTAS ---

app.get('/', (req, res) => {
  res.render('loginEregistro');
});

// Rota de Login
app.post('/inicial', async (req, res) => {
  const { email, senha } = req.body; 
  try {
    const [usuarios] = await pool.query('SELECT * FROM clientes WHERE email = ?', [email]);
    if (usuarios.length === 0) return res.redirect('/');
    
    const usuario = usuarios[0]; 
    if (senha === usuario.senha) {
      req.session.user = { id: usuario.id, nome: usuario.nome, tipo: usuario.tipo_usuario };
      return res.redirect('/inicial');
    } else {
      return res.redirect('/');
    }
  } catch (erro) {
    console.error(erro);
    res.status(500).send("Erro no servidor");
  }
});

app.get('/inicial', (req, res) => { res.render('inicial'); });
app.get('/perfil', (req, res) => { res.render('perfil'); });
app.get('/carrinho', (req, res) => { res.render('carrinho'); });

// Rota da página de Finalização
app.get('/finalizacao', (req, res) => {
    // Se quiser obrigar login, descomente a linha abaixo:
    // if (!req.session.user) { return res.redirect('/'); }
    res.render('finalizacao');
});

// === ROTA PRINCIPAL DO CARDÁPIO ===
app.get('/cardapio', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.id AS categoria_id, c.nome AS categoria,
        p.id AS produto_id, p.nome AS produto, p.descricao,
        t.nome AS tamanho, pt.preco
      FROM categorias c
      LEFT JOIN produtos p ON p.categoria_id = c.id
      LEFT JOIN produtos_tamanhos pt ON pt.produto_id = p.id
      LEFT JOIN tamanhos t ON t.id = pt.tamanho_id
      ORDER BY c.id, p.id;
    `);

    // Busca Adicionais
    let rowsAdicionais = [];
    try {
        const [r] = await pool.query(`SELECT * FROM adicionais`);
        rowsAdicionais = r;
    } catch(e) { console.log("Sem tabela adicionais ou erro na busca"); }

    const categorias = [];
    rows.forEach(r => {
      let cat = categorias.find(c => c.id === r.categoria_id);
      if (!cat) {
        const ads = rowsAdicionais.filter(a => a.categoria_id === r.categoria_id);
        cat = { id: r.categoria_id, nome: r.categoria, produtos: [], adicionais: ads };
        categorias.push(cat);
      }
      if (r.produto_id) {
        let prod = cat.produtos.find(p => p.id === r.produto_id);
        if (!prod) {
          prod = { id: r.produto_id, nome: r.produto, descricao: r.descricao, opcoes: [] };
          cat.produtos.push(prod);
        }
        if (r.tamanho && r.preco != null) {
          prod.opcoes.push({ tamanho: r.tamanho, preco: r.preco });
        }
      }
    });

    res.render("cardapio", { categorias });
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});

// === ROTA DE FINALIZAR PEDIDO (SALVAR NO BANCO) ===
app.post('/finalizar-pedido', async (req, res) => {
    try {
        let { id_cliente, produtos, valor } = req.body;

        console.log("=== DADOS RECEBIDOS ===");
        console.log("id_cliente:", id_cliente);
        console.log("produtos (tipo):", typeof produtos);
        console.log("produtos (valor):", produtos);

        if (!id_cliente) {
            return res.status(400).json({ sucesso: false, erro: "Usuário não logado" });
        }

        let produtosParaSalvar;

        // CASO 1: Já é array (formato correto)
        if (Array.isArray(produtos)) {
            produtosParaSalvar = JSON.stringify(produtos);
        }
        // CASO 2: É string de texto (formato antigo)
        else if (typeof produtos === 'string') {
            // Aceita tanto string descritiva quanto JSON
            try {
                // Tenta parsear como JSON primeiro
                const parsed = JSON.parse(produtos);
                produtosParaSalvar = JSON.stringify(parsed);
            } catch (e) {
                // Se não for JSON, aceita como string descritiva
                produtosParaSalvar = JSON.stringify([{ descricao: produtos }]);
            }
        }
        // CASO 3: Outro formato
        else {
            produtosParaSalvar = JSON.stringify([]);
        }

        console.log("Produtos para salvar:", produtosParaSalvar);

        const query = `
            INSERT INTO pedidos (id_cliente, produtos, valor, status, data_pedido)
            VALUES (?, ?, ?, 'aguarda_confirmacao', NOW())
        `;
        
        const [result] = await pool.query(query, [id_cliente, produtosParaSalvar, valor]);
        console.log("Pedido salvo com ID:", result.insertId);
        
        res.json({ sucesso: true });

    } catch (err) {
        console.error("Erro ao finalizar pedido:", err);
        res.status(500).json({ sucesso: false, erro: "Erro interno ao salvar pedido." });
    }
});

// --- ROTAS DO ADMIN ---

app.get("/fila-pedidos", somenteAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, c.nome AS nome_cliente
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id
      ORDER BY p.data_pedido DESC
    `);

    console.log("Total de pedidos:", rows.length);

    const pedidos = rows.map(p => {
      const data = new Date(p.data_pedido);
      const dia = String(data.getDate()).padStart(2, '0');
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const ano = data.getFullYear();
      const hora = String(data.getHours()).padStart(2, '0');
      const min = String(data.getMinutes()).padStart(2, '0');

      let produtosParsed = [];
      
      if (p.produtos) {
        try {
          if (typeof p.produtos === 'string') {
            produtosParsed = JSON.parse(p.produtos);
          } else {
            produtosParsed = p.produtos;
          }
        } catch (e) {
          console.error(`Erro ao parsear pedido ${p.id}:`, e.message);
          // Se não conseguir parsear, cria estrutura básica
          produtosParsed = [{ descricao: p.produtos }];
        }
      }

      // Garante que é array
      if (!Array.isArray(produtosParsed)) {
        produtosParsed = [produtosParsed];
      }

      return {
        ...p,
        data_formatada: `${dia}/${mes}/${ano} ${hora}:${min}`,
        produtos: produtosParsed
      };
    });

    res.render("fila-pedidos", { pedidos });

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao carregar fila");
  }
});
app.get("/lista-clientes", async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM clientes');
    res.render("lista-clientes", { clientes: rows });
});

app.post('/atualizar-status', async (req, res) => {
    const { id, novo_status } = req.body;
    await pool.query('UPDATE pedidos SET status = ? WHERE id = ?', [novo_status, id]);
    res.json({ sucesso: true });
});

app.post("/editar-pedido", async (req, res) => {
    const { id, valor } = req.body;
    await pool.query("UPDATE pedidos SET valor = ? WHERE id = ?", [valor, id]);
    res.json({ ok: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});