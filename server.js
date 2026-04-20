const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 3000;

// Permite que o nosso index.html converse com este servidor de forma segura
app.use(cors());
app.use(express.json());

// Conecta ao banco de dados SQLite (Ele vai criar um arquivo "banco_escalas.db" sozinho!)
const db = new sqlite3.Database('./banco_escalas.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite com sucesso!');
        // Cria a "tabela" no banco de dados se ela ainda não existir
        db.run(`CREATE TABLE IF NOT EXISTS escalas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT,
            status TEXT,
            data TEXT,
            hora_registro TEXT
        )`);
    }
});

// Rota POST: Recebe os dados do calendário e SALVA no banco
app.post('/api/escalas', (req, res) => {
    const { usuario, status, data, hora_registro } = req.body;
    
    const sql = `INSERT INTO escalas (usuario, status, data, hora_registro) VALUES (?, ?, ?, ?)`;
    db.run(sql, [usuario, status, data, hora_registro], function(err) {
        if (err) {
            return res.status(400).json({ erro: err.message });
        }
        console.log(`Nova escala salva: ${usuario} - ${status} em ${data}`);
        res.json({ mensagem: 'Escala salva e pronta para validação!', id: this.lastID });
    });
});

// Rota GET: Envia as escalas salvas DE VOLTA para o calendário exibir
app.get('/api/escalas', (req, res) => {
    const sql = `SELECT * FROM escalas`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ erro: err.message });
        }
        res.json(rows);
    });
});
// Rota para limpeza em massa por nome e mês
app.delete('/api/escalas/limpar/:usuario/:mesano', (req, res) => {
    const { usuario, mesano } = req.params;
    const [mes, ano] = mesano.split('-');
    // Cria um padrão para buscar todos os dias daquele mês (ex: 2026-04-%)
    const padraoData = `${ano}-${mes.padStart(2, '0')}-%`;

    const sql = `DELETE FROM escalas WHERE usuario = ? AND data LIKE ?`;
    db.run(sql, [usuario, padraoData], function(err) {
        if (err) {
            return res.status(400).json({ erro: err.message });
        }
        console.log(`Escala de ${usuario} limpa para o período ${mesano}`);
        res.json({ mensagem: `Registros de ${usuario} removidos para o mês ${mesano}!` });
    });
});
// Liga o servidor
app.listen(port, () => {
    console.log(`Servidor da T.I. rodando na porta http://localhost:${port}`);
});
// Rota DELETE: Apaga uma escala existente (para quando precisar trocar por folga)
app.delete('/api/escalas/:id', (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM escalas WHERE id = ?`, id, function(err) {
        if (err) {
            return res.status(400).json({ erro: err.message });
        }
        console.log(`Escala apagada com sucesso (ID: ${id})`);
        res.json({ mensagem: 'Escala removida!' });
    });
    
});
