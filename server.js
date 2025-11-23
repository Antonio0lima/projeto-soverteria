// server.js
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

// Rotas
app.get('/', (req, res) => {
    res.render('loginEregistro'); // renderiza views/loginEregistro.ejs como primeira pagina
});

app.get('/cardapio',async(req, res) => {
    try{
      const [rows]=await pool.query('select * from produtos');
      console.log("Produtos carregados:", rows);
      res.render('cardapio',{produtos: rows});
    }catch(err){
      console.error("Erro ao buscar produtos:", err);
      res.status(500).send("Erro ao buscar produtos");
    }
});
app.use(express.urlencoded({ extended: true })); // para ler dados do formulário
app.post('/inicial', (req, res) => {
    // Aqui você pode acessar os dados do formulário com req.body.email, req.body.senha
    res.render('inicial'); // ou res.redirect('/inicial')
});
app.get('/inicial', (req, res) => {
  res.render('inicial');
});


app.get('/perfil', (req, res) => {
    res.render('perfil');
});



/*app.get('/fila-pedidos', (req, res) => {
  res.render('fila-pedidos');
});*/

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
    res.render("fila-pedidos", { pedidos: pedidosFormatados }); // envia 'pedidos' para o EJS
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    res.status(500).send("Erro ao buscar pedidos");
  }
});

app.get("/lista-clientes", async (req, res) => {
  try{
    const [rows] = await pool.query(
      'SELECT * FROM clientes'
    )

    res.render("lista-clientes", {clientes: rows});
  }catch (err) {
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
// Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
