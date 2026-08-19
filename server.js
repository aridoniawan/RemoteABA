const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize mock DB if not exists (Temp before Google Sheets)
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

// Helper to read/write DB
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- API ROUTES ---

// GET All Clients
app.get('/api/clients', (req, res) => {
    try {
        const clients = readDB();
        res.json(clients);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// POST New Client
app.post('/api/clients', (req, res) => {
    try {
        const { rustdeskId, name, notes } = req.body;
        if (!rustdeskId || !name) {
            return res.status(400).json({ error: 'ID and Name are required' });
        }

        const clients = readDB();
        const newClient = {
            id: Date.now().toString(),
            rustdeskId,
            name,
            notes: notes || '',
            lastUpdated: new Date().toISOString()
        };
        
        clients.push(newClient);
        writeDB(clients);
        
        res.status(201).json(newClient);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// PUT Update Client
app.put('/api/clients/:id', (req, res) => {
    try {
        const { rustdeskId, name, notes } = req.body;
        const clients = readDB();
        const index = clients.findIndex(c => c.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Client not found' });
        }

        clients[index] = {
            ...clients[index],
            rustdeskId,
            name,
            notes: notes || '',
            lastUpdated: new Date().toISOString()
        };
        
        writeDB(clients);
        res.json(clients[index]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update data' });
    }
});

// DELETE Client
app.delete('/api/clients/:id', (req, res) => {
    try {
        let clients = readDB();
        clients = clients.filter(c => c.id !== req.params.id);
        writeDB(clients);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete data' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
