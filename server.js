const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('banco_escalas.db', (err) => {
    if (err) console.error('Erro:', err.message);
    else {
        console.log('Banco de dados conectado e operando!');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS escalas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario TEXT, status TEXT, data TEXT, turno TEXT, hora_registro TEXT
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT UNIQUE, cor TEXT, empresa TEXT, cargo TEXT, turno TEXT
            )`);
        });
    }
});

// -- ROTAS DE ESCALA --
app.get('/api/escalas', (req, res) => {
    db.all("SELECT * FROM escalas", [], (err, rows) => res.json(rows));
});

app.post('/api/escalas/lote', (req, res) => {
    const escalas = req.body;
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare(`INSERT INTO escalas (usuario, status, data, turno, hora_registro) VALUES (?, ?, ?, ?, ?)`);
        escalas.forEach(e => stmt.run([e.usuario, e.status, e.data, e.turno, e.hora_registro]));
        stmt.finalize();
        db.run("COMMIT", (err) => res.json({ mensagem: 'Lote salvo com sucesso!' }));
    });
});

app.post('/api/escalas', (req, res) => {
    const { usuario, status, data, turno, hora_registro } = req.body;
    db.run(`INSERT INTO escalas (usuario, status, data, turno, hora_registro) VALUES (?, ?, ?, ?, ?)`, 
    [usuario, status, data, turno, hora_registro], function(err) { res.json({ id: this.lastID }); });
});

app.delete('/api/escalas/:id', (req, res) => {
    db.run(`DELETE FROM escalas WHERE id = ?`, req.params.id, (err) => res.json({ mensagem: 'Deletado' }));
});

app.delete('/api/escalas/limpar/:usuario/:mesano', (req, res) => {
    const { usuario, mesano } = req.params;
    const padraoData = `${mesano.split('-')[1]}-${mesano.split('-')[0].padStart(2, '0')}-%`;
    db.run(`DELETE FROM escalas WHERE usuario = ? AND data LIKE ?`, [usuario, padraoData], (err) => res.json({ mensagem: 'Limpo' }));
});

// -- ROTAS DE USUÁRIOS --
app.get('/api/usuarios', (req, res) => {
    db.all("SELECT * FROM usuarios ORDER BY nome", [], (err, rows) => res.json(rows));
});

app.post('/api/usuarios', (req, res) => {
    const { nome, cor, empresa, cargo, turno } = req.body;
    db.run(`INSERT INTO usuarios (nome, cor, empresa, cargo, turno) VALUES (?, ?, ?, ?, ?)`, 
    [nome, cor, empresa, cargo, turno], (err) => res.json({ mensagem: 'Adicionado' }));
});

app.delete('/api/usuarios/:id', (req, res) => db.run(`DELETE FROM usuarios WHERE id = ?`, req.params.id, (err) => res.json({})));

app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));