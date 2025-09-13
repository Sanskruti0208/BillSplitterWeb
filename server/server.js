// server/server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Read DATABASE_URL from env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false },         
});

// Serve frontend static files
app.use('/', express.static(path.join(__dirname, '..', 'public')));

// API: create bill
app.post('/api/bills', async (req, res) => {
    try {
        const { name, total, fair_share, participants, transactions } = req.body;
        if (!total || !participants) return res.status(400).json({ error: 'Missing fields' });

        const q = `
      INSERT INTO bills (name, total, fair_share, participants, transactions)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *;
    `;
        const vals = [name || 'Untitled bill', total, fair_share, JSON.stringify(participants), JSON.stringify(transactions)];
        const { rows } = await pool.query(q, vals);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});

// API: list bills (recent first)
app.get('/api/bills', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM bills ORDER BY created_at DESC LIMIT 200;');
        const parsed = rows.map(r => ({
            ...r,
            participants: typeof r.participants === 'string' ? JSON.parse(r.participants) : r.participants,
            transactions: typeof r.transactions === 'string' ? JSON.parse(r.transactions) : r.transactions
        }));
        res.json(parsed);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});


// API: get single bill
app.get('/api/bills/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT * FROM bills WHERE id = $1', [id]);
        if (!rows[0]) return res.status(404).json({ error: 'not found' });

        const row = rows[0];
        row.participants = typeof row.participants === 'string' ? JSON.parse(row.participants) : row.participants;
        row.transactions = typeof row.transactions === 'string' ? JSON.parse(row.transactions) : row.transactions;

        res.json(row);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});

// API: delete
app.delete('/api/bills/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM bills WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});

// fallback to index.html for SPA-style
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on', PORT));
