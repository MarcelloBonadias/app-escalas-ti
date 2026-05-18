const express = require('express');
const mysql = require('mysql2/promise'); // Usando a versão moderna (Promise)
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Autoriza o tráfego de imagens pesadas
app.use(express.static('public', { index: 'portal.html' })); // Força o portal como página inicial

// Configuração da conexão com o MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'v1ltrum1t@',
    database: process.env.DB_NAME || 'banco_escalas',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// -- ROTAS DE ESCALA --
app.get('/api/escalas', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM escalas");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/escalas', async (req, res) => {
    const { usuario, status, data, turno, hora_registro } = req.body;
    try {
        const [result] = await pool.execute(
            `INSERT INTO escalas (usuario, status, data, turno, hora_registro) VALUES (?, ?, ?, ?, ?)`,
            [usuario, status, data, turno, hora_registro]
        );
        res.json({ id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
// ==========================================
// ROTAS DE GERENCIAMENTO DA EQUIPE
// ==========================================

// 1. BUSCAR OS DADOS (Agora puxando TUDO, inclusive as colunas novas)
app.get('/api/usuarios', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM usuarios');
        res.json(rows);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// 2. SALVAR/CADASTRAR (Agora inserindo o telefone, email e descricao)
app.post('/api/usuarios', async (req, res) => {
    const { nome, cor, empresa, cargo, turno, foto, telefone, email, descricao } = req.body; 
    try {
        const [result] = await pool.execute(
            `INSERT INTO usuarios (nome, cor, empresa, cargo, turno, foto, telefone, email, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nome, cor, empresa, cargo, turno, foto || null, telefone || null, email || null, descricao || null]
        );
        res.json({ id: result.insertId });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// 3. EXCLUIR
app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        await pool.execute('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/api/usuarios', async (req, res) => {
    // Agora o servidor sabe que precisa receber o telefone, email e descricao
    const { nome, cor, empresa, cargo, turno, foto, telefone, email, descricao } = req.body; 
    
    try {
        const [result] = await pool.execute(
            `INSERT INTO usuarios (nome, cor, empresa, cargo, turno, foto, telefone, email, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nome, cor, empresa, cargo, turno, foto || null, telefone || null, email || null, descricao || null]
        );
        res.json({ id: result.insertId });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        await pool.execute("DELETE FROM usuarios WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// ROTA DO GERADOR (LOTE DE ESCALAS)
// ==========================================
app.post('/api/escalas/lote', async (req, res) => {
    const lote = req.body; // Array com várias escalas
    if (!Array.isArray(lote) || lote.length === 0) return res.status(400).json({ error: "Lote vazio" });
    
    try {
        // Prepara os dados para inserção em massa no MySQL
        const valores = lote.map(e => [e.usuario, e.status, e.data, e.turno, e.hora_registro]);
        await pool.query(
            `INSERT INTO escalas (usuario, status, data, turno, hora_registro) VALUES ?`,
            [valores]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// ROTAS DE EXCLUSÃO DE ESCALAS
// ==========================================
app.delete('/api/escalas/:id', async (req, res) => {
    try {
        await pool.execute("DELETE FROM escalas WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/escalas/limpar/:usuario/:mes', async (req, res) => {
    const { usuario, mes } = req.params; // mes vem no formato YYYY-MM
    try {
        await pool.execute("DELETE FROM escalas WHERE usuario = ? AND data LIKE ?", [usuario, `${mes}-%`]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
// O Node entrega o portal.html como página inicial (Atualizado para Express 5)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'portal.html'));
});

app.listen(port, () => console.log(`NOC Server rodando na porta ${port}`));
