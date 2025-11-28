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

    // Busca os dados completos do usuário logado
    const [usuarios] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.session.user.id]);
    
    if (usuarios.length === 0) {
      return res.status(404).send("Usuário não encontrado");
    }

    const usuario = usuarios[0];

    // Busca o total de pedidos do usuário
    const [pedidosCount] = await pool.query('SELECT COUNT(*) as total FROM pedidos WHERE id_cliente = ?', [req.session.user.id]);
    
    // Formata os dados para a view
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

app.get('/menuAdm', somenteAdmin, (req, res) => {
  res.render('menuAdm');
});

app.get('/registro', (req, res) => {
  res.render('registro');
});
// Rota de Registro
// Rota para registrar novo usuário
// Rota para registrar novo usuário
app.post('/registrar', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).send("Preencha todos os campos!");
    }

    // Verifica se o e-mail já está cadastrado
    const [verifica] = await pool.query(
      "SELECT id FROM clientes WHERE email = ?",
      [email]
    );

    if (verifica.length > 0) {
      return res.status(400).send("Email já está em uso!");
    }

    // Salvar no banco SEM HASH
    await pool.query(
      "INSERT INTO clientes (nome, email, senha, tipo_usuario, data_cadastro) VALUES (?, ?, ?, 'cliente', NOW())",
      [nome, email, senha]
    );

    res.redirect("/");
  } catch (erro) {
    console.error("Erro ao registrar:", erro);
    res.status(500).send("Erro no servidor");
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

    console.log("Dados recebidos para atualização:", { nome, data_nascimento, chave_pix });

    // Validações básicas
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ sucesso: false, erro: "Nome é obrigatório" });
    }

    // Atualiza no banco de dados
    const query = `
      UPDATE clientes 
      SET nome = ?, data_nascimento = ?, chave_pix = ?
      WHERE id = ?
    `;
    
    await pool.query(query, [nome.trim(), data_nascimento || null, chave_pix || null, userId]);

    // Atualiza a sessão com o novo nome
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

// Função auxiliar para formatar data para exibição
function formatarData(data) {
  if (!data) return '';
  const dataObj = new Date(data);
  const dia = String(dataObj.getDate()).padStart(2, '0');
  const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
  const ano = dataObj.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

// Função auxiliar para formatar data para input type="date"
function formatarDataParaInput(data) {
  if (!data) return '';
  const dataObj = new Date(data);
  const ano = dataObj.getFullYear();
  const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
  const dia = String(dataObj.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}


// Rota da página de Finalização
app.get('/finalizacao', (req, res) => {
    // Se quiser obrigar login, descomente a linha abaixo:
    // if (!req.session.user) { return res.redirect('/'); }
    res.render('finalizacao');
});

// === NOVA ROTA DE SUCESSO ===
app.get('/pedido-concluido', (req, res) => {
    res.render('pedido-concluido');
});
// ============================

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
        const pedidoId = result.insertId;
        
        console.log("Pedido salvo com ID:", pedidoId);
        
        // CRIAR NOTIFICAÇÃO AUTOMÁTICA AO CRIAR PEDIDO
        await criarNotificacao(
            id_cliente,
            pedidoId,
            'Pedido Realizado com Sucesso! 🎉',
            `Seu pedido #${pedidoId} foi recebido e está aguardando confirmação. Valor: R$ ${valor}`
        );
        
        console.log(`Notificação de confirmação enviada para cliente ${id_cliente}`);
        
        res.json({ sucesso: true });

    } catch (err) {
        console.error("Erro ao finalizar pedido:", err);
        res.status(500).json({ sucesso: false, erro: "Erro interno ao salvar pedido." });
    }
});

app.get("/historico", async (req, res) => {
  try {
    // Verifica se o usuário está logado
    if (!req.session.user) {
      return res.redirect('/');
    }

    const userId = req.session.user.id;

    // Busca apenas os pedidos do usuário logado
    const [rows] = await pool.query(`
      SELECT p.*, c.nome AS nome_cliente
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id
      WHERE p.id_cliente = ?
      ORDER BY p.data_pedido DESC
    `, [userId]);

    console.log(`Encontrados ${rows.length} pedidos para o usuário ${userId}`);

    const pedidosFormatados = rows.map(p => {
      const data = new Date(p.data_pedido);
      const dia = String(data.getDate()).padStart(2, '0');
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const ano = data.getFullYear();
      const hora = String(data.getHours()).padStart(2, '0');
      const min = String(data.getMinutes()).padStart(2, '0');
      
      // Processa os produtos para exibição
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
          console.error(`Erro ao processar produtos do pedido ${p.id}:`, e);
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

// Rota de Logout
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao fazer logout:', err);
      return res.status(500).json({ sucesso: false, erro: "Erro ao fazer logout" });
    }
    res.json({ sucesso: true });
  });
});

// === SISTEMA DE NOTIFICAÇÕES (PÁGINA SEPARADA) ===

// Rota da página de notificações
app.get('/notificacoes', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/');
    }

    const [notificacoes] = await pool.query(`
      SELECT * FROM notificacoes 
      WHERE usuario_id = ? 
      ORDER BY data_criacao DESC
    `, [req.session.user.id]);

    // Formatar datas
    const notificacoesFormatadas = notificacoes.map(not => ({
      ...not,
      data_formatada: formatarData(not.data_criacao)
    }));

    res.render('notificacoes', { 
      notificacoes: notificacoesFormatadas 
    });

  } catch (erro) {
    console.error('Erro ao carregar notificações:', erro);
    res.status(500).send("Erro ao carregar notificações");
  }
});

// API para marcar notificação como lida
app.post('/notificacao/marcar-lida', async (req, res) => {
  try {
    const { notificacao_id } = req.body;
    await pool.query('UPDATE notificacoes SET lida = 1 WHERE id = ?', [notificacao_id]);
    res.json({ sucesso: true });
  } catch (erro) {
    console.error('Erro ao marcar notificação:', erro);
    res.status(500).json({ sucesso: false, erro: "Erro interno" });
  }
});

// API para marcar todas como lidas
app.post('/notificacoes/marcar-todas-lidas', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ sucesso: false, erro: "Usuário não logado" });
    }

    await pool.query(
      'UPDATE notificacoes SET lida = 1 WHERE usuario_id = ? AND lida = 0',
      [req.session.user.id]
    );

    res.json({ sucesso: true });
  } catch (erro) {
    console.error('Erro ao marcar todas como lidas:', erro);
    res.status(500).json({ sucesso: false, erro: "Erro interno" });
  }
});

// API para contar notificações não lidas (para badge se quiser depois)
app.get('/notificacoes/contador', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ sucesso: false, total: 0 });
    }

    const [result] = await pool.query(
      'SELECT COUNT(*) as total FROM notificacoes WHERE usuario_id = ? AND lida = 0',
      [req.session.user.id]
    );

    res.json({ sucesso: true, total: result[0].total });
  } catch (erro) {
    console.error('Erro ao contar notificações:', erro);
    res.json({ sucesso: false, total: 0 });
  }
});

// Função para criar notificação
// Função para criar notificação
async function criarNotificacao(usuario_id, pedido_id, titulo, mensagem) {
  try {
    console.log("=== CRIANDO NOTIFICAÇÃO ===");
    console.log("Usuário ID:", usuario_id);
    console.log("Pedido ID:", pedido_id);
    console.log("Título:", titulo);
    console.log("Mensagem:", mensagem);
    
    const [result] = await pool.query(`
      INSERT INTO notificacoes (usuario_id, pedido_id, titulo, mensagem, tipo, lida, data_criacao)
      VALUES (?, ?, ?, ?, 'status_pedido', 0, NOW())
    `, [usuario_id, pedido_id, titulo, mensagem]);
    
    console.log(`✅ Notificação criada com ID: ${result.insertId} para usuário ${usuario_id}`);
    return result.insertId;
    
  } catch (erro) {
    console.error('❌ Erro ao criar notificação:', erro);
    throw erro;
  }
}

// Modifique a rota de atualizar status para incluir notificação
app.post('/atualizar-status', async (req, res) => {
  try {
    const { id, novo_status } = req.body;
    
    console.log("=== ATUALIZANDO STATUS ===");
    console.log("Pedido ID:", id);
    console.log("Novo status:", novo_status);
    
    // Buscar informações do pedido antes de atualizar
    const [pedidos] = await pool.query(`
      SELECT p.*, c.id as cliente_id, c.nome as cliente_nome 
      FROM pedidos p 
      JOIN clientes c ON p.id_cliente = c.id 
      WHERE p.id = ?
    `, [id]);
    
    if (pedidos.length === 0) {
      return res.json({ sucesso: false, erro: "Pedido não encontrado" });
    }
    
    const pedido = pedidos[0];
    console.log("Cliente do pedido:", pedido.cliente_id);
    
    // Atualizar status
    await pool.query('UPDATE pedidos SET status = ? WHERE id = ?', [novo_status, id]);
    
    // Mapear status para mensagens (agora incluindo os status da sua fila)
    const mensagensStatus = {
      'aguarda_confirmacao': { 
        titulo: 'Pedido Recebido 🎉', 
        mensagem: 'Seu pedido foi recebido e está aguardando confirmação' 
      },
      'confirmado': { 
        titulo: 'Pedido Confirmado! ✅', 
        mensagem: 'Seu pedido foi confirmado e está em preparação' 
      },
      'aguarda_entrega': { 
        titulo: 'Pedido Pronto! 🚀', 
        mensagem: 'Seu pedido está pronto e aguardando entrega' 
      },
      'concluido': { 
        titulo: 'Pedido Entregue! 🎊', 
        mensagem: 'Seu pedido foi entregue com sucesso. Obrigado!' 
      },
      'cancelado': { 
        titulo: 'Pedido Cancelado', 
        mensagem: 'Seu pedido foi cancelado' 
      }
    };
    
    const mensagem = mensagensStatus[novo_status] || { 
      titulo: 'Status Atualizado', 
      mensagem: `Status do seu pedido foi alterado para: ${novo_status}` 
    };
    
    // Criar notificação
    await criarNotificacao(
      pedido.cliente_id,
      pedido.id,
      mensagem.titulo,
      `${mensagem.mensagem} - Pedido #${pedido.id}`
    );
    
    console.log(`Notificação enviada para cliente ${pedido.cliente_id}`);
    
    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    res.status(500).json({ sucesso: false, erro: "Erro interno" });
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

app.get('/api/cliente/:id/estatisticas', somenteAdmin, async (req, res) => {
  try {
    const clienteId = req.params.id;
    
    // Total de pedidos
    const [totalPedidos] = await pool.query(
      'SELECT COUNT(*) as total FROM pedidos WHERE id_cliente = ?',
      [clienteId]
    );
    
    // Último pedido
    const [ultimoPedido] = await pool.query(
      'SELECT data_pedido FROM pedidos WHERE id_cliente = ? ORDER BY data_pedido DESC LIMIT 1',
      [clienteId]
    );
    
    res.json({
      sucesso: true,
      totalPedidos: totalPedidos[0].total,
      ultimoPedido: ultimoPedido[0] ? ultimoPedido[0].data_pedido : null
    });
    
  } catch (erro) {
    console.error('Erro ao buscar estatísticas:', erro);
    res.json({ 
      sucesso: false, 
      totalPedidos: 0, 
      ultimoPedido: null 
    });
  }
});
app.get("/lista-clientes", somenteAdmin, async (req, res) => {
  try {
    const [clientes] = await pool.query(`
      SELECT 
        id, nome, email, tipo_usuario, 
        data_nascimento, data_cadastro, 
        chave_pix, telefone
      FROM clientes 
      ORDER BY nome
    `);
    
    // Formatar datas
    const clientesFormatados = clientes.map(cliente => ({
      ...cliente,
      data_nascimento: cliente.data_nascimento ? formatarData(cliente.data_nascimento) : null,
      data_cadastro: formatarData(cliente.data_cadastro)
    }));

    res.render("lista-clientes", { 
      clientes: clientesFormatados 
    });
  } catch (erro) {
    console.error('Erro ao carregar lista de clientes:', erro);
    res.status(500).send("Erro ao carregar lista de clientes");
  }
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

app.get("/lista-produtos", somenteAdmin, async (req, res) => {
  try {
    // Busca categorias com seus produtos
    const [categorias] = await pool.query(`
      SELECT c.id AS categoria_id, c.nome AS categoria_nome,
             p.id AS produto_id, p.nome AS produto_nome, p.descricao,
             t.id AS tamanho_id, t.nome AS tamanho_nome, pt.preco
      FROM categorias c
      LEFT JOIN produtos p ON p.categoria_id = c.id
      LEFT JOIN produtos_tamanhos pt ON pt.produto_id = p.id
      LEFT JOIN tamanhos t ON t.id = pt.tamanho_id
      ORDER BY c.id, p.id, t.id
    `);

    // Busca adicionais
    const [adicionais] = await pool.query(`
      SELECT a.*, c.nome AS categoria_nome 
      FROM adicionais a 
      LEFT JOIN categorias c ON a.categoria_id = c.id
      ORDER BY c.id, a.nome
    `);

    // Organiza os dados por categoria
    const categoriasOrganizadas = [];
    categorias.forEach(row => {
      let categoria = categoriasOrganizadas.find(c => c.id === row.categoria_id);
      if (!categoria) {
        categoria = {
          id: row.categoria_id,
          nome: row.categoria_nome,
          produtos: []
        };
        categoriasOrganizadas.push(categoria);
      }

      if (row.produto_id) {
        let produto = categoria.produtos.find(p => p.id === row.produto_id);
        if (!produto) {
          produto = {
            id: row.produto_id,
            nome: row.produto_nome,
            descricao: row.descricao,
            tamanhos: []
          };
          categoria.produtos.push(produto);
        }

        if (row.tamanho_id) {
          produto.tamanhos.push({
            id: row.tamanho_id,
            nome: row.tamanho_nome,
            preco: row.preco
          });
        }
      }
    });

    res.render("lista-produtos", { 
      categorias: categoriasOrganizadas,
      adicionais: adicionais 
    });
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    res.status(500).send("Erro ao carregar lista de produtos");
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});