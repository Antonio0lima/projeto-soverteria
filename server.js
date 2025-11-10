// server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", "./views");
// Pasta pública para CSS, JS e imagens
app.use(express.static(path.join(__dirname, 'public')));

// Rotas
app.get('/', (req, res) => {
    res.render('loginEregistro'); // renderiza views/loginEregistro.ejs como primeira pagina
});

app.get('/cardapio', (req, res) => {
    res.render('cardapio');
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

app.get('/lista-clientes', (req, res) => {
  res.render('lista-clientes');
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

// Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
