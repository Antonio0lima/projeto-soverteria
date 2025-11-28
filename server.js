import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import dotenv from "dotenv";
import session from "express-session";
import multer from 'multer'; // [Novo] Import para upload
import fs from 'fs';         // [Novo] Import para gerenciar pastas

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURAÇÃO DO MULTER (UPLOAD DE ARQUIVOS) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Define a pasta onde os comprovantes serão salvos
    const dir = './public/uploads/comprovantes/';
    
    // Cria a pasta se ela não existir
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Gera um nome único para não substituir arquivos iguais (Data + Nome Original)
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

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
      req.session.user = { 
        id: usuario.id, 
        nome: usuario.nome, 
        email: usuario.email,
        tipo: usuario.tipo_usuario 
      };
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
app.get('/carrinho', (req, res) => { res.render('carrinho'); });

app.get('/perfil', async (req, res) => { 
  try {
    if (!req.session.user) {
      return res.redirect('/');
    }

    const [usuarios] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.session.user.id]);
    
    if (usuarios.length === 0) {
      return res.status(404).send("Usuário não encontrado");
    }

    const usuario = usuarios[0];
    const [pedidosCount] = await pool.query('SELECT COUNT(*) as total FROM pedidos WHERE id_cliente = ?', [req.session.user.id]);
    
    const dadosUsuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      data_nascimento: usuario.data_nascimento ? formatarDataParaInput(usuario.data_nascimento) : '',
      data_nascimento_formatada: usuario.data_nascimento ? formatarData(usuario.data_nascimento) : 'Não informada',
      data_cadastro: usuario.data_cadastro ? formatarData(usuario.data_cadastro) : 'Não informada',
      chave_pix: usuario.chave_pix || 'Não cadastrada',
      total_pedidos: pedidosCount[0].total
    };

    res.render('perfil', { usuario: dadosUsuario });
  } catch (erro) {
    console.error('Erro ao carregar perfil:', erro);
    res.status(500).send("Erro ao carregar perfil");
  }
});

// Rota para atualizar dados do perfil
app.post('/atualizar-perfil', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ sucesso: false, erro: "Usuário não logado" });
    }

    const { nome, data_nascimento, chave_pix } = req.body;
    const userId = req.session.user.id;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ sucesso: false, erro: "Nome é obrigatório" });
    }

    const query = `
      UPDATE clientes 
      SET nome = ?, data_nascimento = ?, chave_pix = ?
      WHERE id = ?
    `;
    
    await pool.query(query, [nome.trim(), data_nascimento || null, chave_pix || null, userId]);

    req.session.user.nome = nome.trim();

    res.json({ 
      sucesso: true, 
      mensagem: "Perfil atualizado com sucesso!",
      dados: { nome: nome.trim() }
    });

  } catch (erro) {
    console.error('Erro ao atualizar perfil:', erro);
    res.status(500).json({ sucesso: false, erro: "Erro interno ao atualizar perfil" });
  }
});

// Funções auxiliares de data
function formatarData(data) {
  if (!data) return '';
  const dataObj = new Date(data);
  const dia = String(dataObj.getDate()).padStart(2, '0');
  const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
  const ano = dataObj.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function formatarDataParaInput(data) {
  if (!data) return '';
  const dataObj = new Date(data);
  const ano = dataObj.getFullYear();
  const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
  const dia = String(dataObj.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

app.get('/finalizacao', (req, res) => {
    res.render('finalizacao');
});

app.get('/pedido-concluido', (req, res) => {
    res.render('pedido-concluido');
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

// === ROTA DE FINALIZAR PEDIDO (ATUALIZADA COM UPLOAD) ===
app.post('/finalizar-pedido', upload.single('comprovante'), async (req, res) => {
    try {
        console.log("=== PROCESSANDO PEDIDO ===");
        
        // Dados de texto vêm em req.body
        let { id_cliente, produtos, valor } = req.body;

        if (!id_cliente) {
            return res.status(400).json({ sucesso: false, erro: "Usuário não logado" });
        }

        // Parse dos produtos (pois FormData envia arrays como string)
        let produtosParaSalvar;
        try {
            const parsed = JSON.parse(produtos);
            produtosParaSalvar = JSON.stringify(parsed);
        } catch (e) {
            console.error("Erro ao parsear produtos:", e);
            produtosParaSalvar = JSON.stringify([]);
        }

        // 1. Inserir Pedido
        const queryPedido = `
            INSERT INTO pedidos (id_cliente, produtos, valor, status, data_pedido)
            VALUES (?, ?, ?, 'aguarda_confirmacao', NOW())
        `;
        
        const [result] = await pool.query(queryPedido, [id_cliente, produtosParaSalvar, valor]);
        const idNovoPedido = result.insertId;
        console.log("Pedido criado com ID:", idNovoPedido);

        // 2. Se houver arquivo, salvar na tabela de comprovantes
        if (req.file) {
            // Caminho relativo para acessar via navegador
            const caminhoRelativo = '/uploads/comprovantes/' + req.file.filename;
            
            const queryComprovante = `
                INSERT INTO comprovantes_pix (id_pedido, nome_arquivo, caminho_arquivo)
                VALUES (?, ?, ?)
            `;
            await pool.query(queryComprovante, [idNovoPedido, req.file.originalname, caminhoRelativo]);
            console.log("Comprovante vinculado com sucesso.");
        }
        
        res.json({ sucesso: true, id_pedido: idNovoPedido });

    } catch (err) {
        console.error("Erro ao finalizar pedido:", err);
        res.status(500).json({ sucesso: false, erro: "Erro interno ao salvar pedido." });
    }
});

app.get("/historico", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/');
    }

    const userId = req.session.user.id;

    const [rows] = await pool.query(`
      SELECT p.*, c.nome AS nome_cliente
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id
      WHERE p.id_cliente = ?
      ORDER BY p.data_pedido DESC
    `, [userId]);

    const pedidosFormatados = rows.map(p => {
      const data = new Date(p.data_pedido);
      const dia = String(data.getDate()).padStart(2, '0');
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const ano = data.getFullYear();
      const hora = String(data.getHours()).padStart(2, '0');
      const min = String(data.getMinutes()).padStart(2, '0');
      
      let produtosProcessados = [];
      if (p.produtos) {
        try {
          if (typeof p.produtos === 'string') {
            const parsed = JSON.parse(p.produtos);
            produtosProcessados = Array.isArray(parsed) ? parsed : [parsed];
          } else {
            produtosProcessados = Array.isArray(p.produtos) ? p.produtos : [p.produtos];
          }
        } catch (e) {
          produtosProcessados = [{ descricao: p.produtos }];
        }
      }

      return {
        ...p,
        data_pedido: `${dia}/${mes}/${ano} ${hora}:${min}`,
        produtos: produtosProcessados
      };
    });

    res.render("historico", { pedidos: pedidosFormatados });

  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    res.status(500).send("Erro ao buscar pedidos");
  }
});

// --- ROTAS DO ADMIN ---

app.get("/fila-pedidos", somenteAdmin, async (req, res) => {
  try {
    // ATENÇÃO: Adicionado LEFT JOIN para pegar o comprovante se existir
    const query = `
      SELECT p.*, c.nome AS nome_cliente, cp.caminho_arquivo AS comprovante
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id
      LEFT JOIN comprovantes_pix cp ON cp.id_pedido = p.id
      ORDER BY p.data_pedido DESC
    `;

    const [rows] = await pool.query(query);

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
          produtosParsed = [{ descricao: p.produtos }];
        }
      }

      if (!Array.isArray(produtosParsed)) {
        produtosParsed = [produtosParsed];
      }

      return {
        ...p,
        data_formatada: `${dia}/${mes}/${ano} ${hora}:${min}`,
        produtos: produtosParsed,
        comprovante: p.comprovante // Passa o link do comprovante para a view
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