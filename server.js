// server.js
const express = require('express');
const app = express();
const path = require('path');

// Configura o EJS como view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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

app.get('/fila-pedidos', (req, res) => {
  res.render('fila-pedidos');
});

// Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
