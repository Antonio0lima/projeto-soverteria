import mysql from 'mysql2/promise';

const conexao = await mysql.createConnection({
  host: 'localhost',      // servidor (geralmente localhost)
  user: 'root',           // seu usuário do MySQL
  password: '17082002', // substitui pela tua senha
  database: 'sorveteria'  // nome do banco
});

console.log('✅ Conectado ao banco de dados MySQL!');

export default conexao;