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
    res.render('inicial'); // renderiza views/inicial.ejs
});

app.get('/cadarpio', (req, res) => {
    res.render('cadarpio');
});

app.get('/login', (req, res) => {
    res.render('loginEregistro');
});

app.get('/perfil', (req, res) => {
    res.render('perfil');
});

// Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
