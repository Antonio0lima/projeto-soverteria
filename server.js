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



// Rotas
app.get('/', (req, res) => {
  res.render('loginEregistro');
});

app.get('/cardapio',async(req, res) => {
    try{
      const [rows]=await pool.query('select * from categorias');
      console.log("Produtos carregados:", rows);
      res.render('cardapio',{produtos: rows});
    }catch(err){
      console.error("Erro ao buscar produtos:", err);
      res.status(500).send("Erro ao buscar produtos");
    }
});

app.post('/inicial', async (req, res) => {
  const { email, senha } = req.body; // Pega o que o usuário digitou

  try {
    // 1. Buscamos no banco APENAS o usuário com aquele email
    // O '?' previne injeção de SQL
    const [usuarios] = await pool.query('SELECT * FROM clientes WHERE email = ?', [email]);

    // 2. Se a lista vier vazia, o usuário não existe
    if (usuarios.length === 0) {
      // Dica: idealmente, envie uma mensagem de erro para a tela
      console.log("Usuário não encontrado!");
      return res.redirect('/');
    }

    const usuario = usuarios[0]; // Pegamos o primeiro (e único) resultado

    req.session.user = {
      id: usuario.id,
      nome: usuario.nome,
      tipo: usuario.tipo_usuario // admin, gerente, etc.
    };
    // 3. Verificamos se a senha bate
    // ATENÇÃO: Em produção, use bcrypt.compare(senha, usuario.senha)
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
    res.render("fila-pedidos", { pedidos: pedidosFormatados }); // envia 'pedidos' para o EJS
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    res.status(500).send("Erro ao buscar pedidos");
  }
});

app.get("/lista-clientes", async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM clientes'
    )

    res.render("lista-clientes", { clientes: rows });
  } catch (err) {
    console.error("Erro ao buscar clientes:", err);
    res.status(500).send("Erro ao buscar clientes");
  }

})

app.post('/atualizar-status', async (req, res) => {
  try {
    // desestruturamos as chaves que o front está enviando: id e novo_status
    const { id, novo_status } = req.body;

    console.log('Recebido no servidor:', req.body); // debug completo do corpo
    console.log('Id:', id, 'Novo status:', novo_status);

    // validação simples
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
    res.render("historico", { pedidos: pedidosFormatados }); // envia 'pedidos' para o EJS
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    res.status(500).send("Erro ao buscar pedidos");
  }
});


// Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
