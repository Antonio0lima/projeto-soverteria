// server.js (Mantendo o original e adicionando o carrinho)
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

app.use(
  session({
    secret: "qualquercoisa-super-secreta",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 } // 1 hora
  })
);

app.use((req, res, next) => {
  res.locals.usuario = req.session.user || null;
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", "./views");
// Pasta pública para CSS, JS e imagens
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function somenteAdmin(req, res, next) {
  if (!req.session.user || req.session.user.tipo !== "admin") {
    return res.status(403).send("Acesso negado");
  }
  next();
}

// Rotas Originais (INTACTAS)
app.get('/', (req, res) => {
  res.render('loginEregistro');
});

app.get('/cardapio', async (req, res) => {
  try {
    // 1. Busca Categorias, Produtos e Tamanhos (Query Antiga)
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

    // 2. Busca TODOS os adicionais
    const [rowsAdicionais] = await pool.query(`SELECT * FROM adicionais`);

    // 3. Monta o Objeto Principal
    const categorias = [];

    rows.forEach(r => {
      let cat = categorias.find(c => c.id === r.categoria_id);
      if (!cat) {
        // AQUI: Filtramos os adicionais que pertencem a esta categoria
        const adicionaisDaCategoria = rowsAdicionais.filter(a => a.categoria_id === r.categoria_id);
        
        cat = { 
            id: r.categoria_id, 
            nome: r.categoria, 
            produtos: [],
            adicionais: adicionaisDaCategoria 
        };
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

app.post('/inicial', async (req, res) => {
  const { email, senha } = req.body; 

  try {
    const [usuarios] = await pool.query('SELECT * FROM clientes WHERE email = ?', [email]);

    if (usuarios.length === 0) {
      console.log("Usuário não encontrado!");
      return res.redirect('/');
    }

    const usuario = usuarios[0]; 

    req.session.user = {
      id: usuario.id,
      nome: usuario.nome,
      tipo: usuario.tipo_usuario 
    };

    if (senha === usuario.senha) {
      console.log(`Login realizado: ${usuario.nome} (${usuario.tipo_usuario})`);
      return res.redirect('/inicial');
    } else {
      console.log("Senha incorreta!");
      return res.redirect('/');
    }

  } catch (erro) {
    console.error("Erro no login:", erro);
    res.status(500).send("Erro no servidor");
  }
});

app.get('/inicial', (req, res) => {
  res.render('inicial');
});

app.get('/perfil', (req, res) => {
  res.render('perfil');
});

app.get("/fila-pedidos", somenteAdmin, async (req, res) => {
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
  try {
    const [rows] = await pool.query('SELECT * FROM clientes')
    res.render("lista-clientes", { clientes: rows });
  } catch (err) {
    console.error("Erro ao buscar clientes:", err);
    res.status(500).send("Erro ao buscar clientes");
  }
})

app.post('/atualizar-status', async (req, res) => {
  try {
    const { id, novo_status } = req.body;
    console.log('Recebido no servidor:', req.body); 
    console.log('Id:', id, 'Novo status:', novo_status);

    if (!id || !novo_status) {
      return res.status(400).json({ error: 'id ou novo_status ausente no corpo da requisição' });
    }

    const [result] = await pool.query(
      'UPDATE pedidos SET status = ? WHERE id = ?',
      [novo_status, id]
    );

    res.json({ sucesso: true, linhasAfetadas: result.affectedRows });
  } catch (err) {
    console.error('❌ Erro detalhado ao atualizar status:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/editar-pedido", async (req, res) => {
  const { id, valor } = req.body;
  console.log("Recebido para edição:", id, valor);

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

app.get("/historico", async (req, res) => {
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
    res.render("historico", { pedidos: pedidosFormatados }); 
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    res.status(500).send("Erro ao buscar pedidos");
  }
});

// ========================================================
//              NOVAS ROTAS DO CARRINHO (ADICIONADAS)
// ========================================================

app.get('/carrinho', (req, res) => {
    res.render('carrinho');
});

app.post('/finalizar-pedido', async (req, res) => {
    try {
        const { id_cliente, produtos, valor } = req.body;

        if (!id_cliente) {
            return res.status(401).json({ sucesso: false, erro: "Usuário não logado." });
        }

        // Insere o pedido na tabela 'pedidos' que você já usa no fila-pedidos
        const query = `
            INSERT INTO pedidos (id_cliente, produtos, valor, status, data_pedido)
            VALUES (?, ?, ?, 'aguarda_confirmacao', NOW())
        `;

        await pool.query(query, [id_cliente, produtos, valor]);

        res.json({ sucesso: true });

    } catch (err) {
        console.error("Erro ao finalizar pedido:", err);
        res.status(500).json({ sucesso: false, erro: "Erro interno no servidor." });
    }
});

// ========================================================

// Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});