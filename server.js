// ==========================
// Imports e Configuração
// ==========================
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createServer } from 'node:http';

dotenv.config();

const app = express();
const server = createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================
// Middlewares
// ==========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set("view engine", "ejs");
app.set("views", "./views");

// ==========================
// Rotas - Páginas principais
// ==========================
app.get('/', (req, res) => {
    res.render('loginEregistro');
});

app.get('/inicial', (req, res) => {
    res.render('inicial');
});

app.post('/inicial', (req, res) => {
    res.render('inicial');
});

app.get('/perfil', (req, res) => {
    res.render('perfil');
});



// ==========================
// Rotas - Cardápio
// ==========================
app.get('/cardapio', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM produtos');
        console.log("Produtos carregados:", rows);
        res.render('cardapio', { produtos: rows });
    } catch (err) {
        console.error("Erro ao buscar produtos:", err);
        res.status(500).send("Erro ao buscar produtos");
    }
});

// ==========================
// Rotas - Fila de pedidos
// ==========================
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

// ==========================
// Rotas - Lista de clientes
// ==========================
app.get("/lista-clientes", async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM clientes');
        res.render("lista-clientes", { clientes: rows });
    } catch (err) {
        console.error("Erro ao buscar clientes:", err);
        res.status(500).send("Erro ao buscar clientes");
    }
});

// ==========================
// Rotas - Atualização de pedidos
// ==========================
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
        console.error('Erro detalhado ao atualizar status:', err);
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

// ==========================
// Chat em tempo real (Socket.IO)
// ==========================
const io = new Server(server);

io.on('connection', (socket) => {
    console.log('Novo usuário conectado:', socket.id);

    socket.on('mensagem', (dados) => {
        io.emit('mensagem', dados);
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado:', socket.id);
    });
});

app.get('/chat', (req, res) => {
  const chats = [
    { nome: "João", ultimaMensagem: "Olá, tudo bem?" },
    { nome: "Maria", ultimaMensagem: "Preciso de ajuda com meu pedido." }
  ];

  const chatAtual = {
    nome: "Maria",
    mensagens: ["Oi Maria!", "Como posso te ajudar?"]
  };

  res.render('chat', { chats, chatAtual });
});

// ==========================
// Inicialização do servidor
// ==========================
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
