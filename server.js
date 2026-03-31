const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

const uploadsDir = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'uploads') : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage });
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Initialize SQLite database
const dbPath = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR, 'uleman_v3.db') : path.resolve(__dirname, 'uleman_v3.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');

    // Create Config Table
    db.run(`CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      couple_names TEXT,
      wedding_date TEXT,
      theme TEXT,
      akad_address TEXT,
      akad_maps TEXT,
      resepsi_address TEXT,
      resepsi_maps TEXT,
      bank_name TEXT,
      bank_account TEXT,
      gift_address TEXT,
      admin_username TEXT,
      admin_password TEXT,
      admin_name TEXT,
      admin_email TEXT,
      groom_photo TEXT,
      bride_photo TEXT,
      akad_time TEXT,
      resepsi_time TEXT,
      hero_bg TEXT,
      hero_photo TEXT,
      groom_parents TEXT,
      bride_parents TEXT,
      music TEXT
    )`, () => {
      // Ensure schema is fully healed from legacy or interrupted creations
      const requiredColumns = {
        'akad_address': 'TEXT', 'akad_maps': 'TEXT',
        'resepsi_address': 'TEXT', 'resepsi_maps': 'TEXT',
        'bank_name': 'TEXT', 'bank_account': 'TEXT', 'gift_address': 'TEXT',
        'admin_username': 'TEXT DEFAULT "admin"', 'admin_password': 'TEXT DEFAULT "admin"',
        'admin_name': 'TEXT DEFAULT "Administrator"', 'admin_email': 'TEXT DEFAULT "admin@uleman.com"',
        'groom_photo': 'TEXT', 'bride_photo': 'TEXT', 
        'akad_time': 'TEXT DEFAULT "08:00 WIB - Selesai"', 'resepsi_time': 'TEXT DEFAULT "11:00 WIB - Selesai"',
        'hero_bg': 'TEXT', 'hero_photo': 'TEXT',
        'groom_parents': 'TEXT DEFAULT "Bpk. Suherman & Ibu Yanti"', 'bride_parents': 'TEXT DEFAULT "Bpk. Juhadi & Ibu Ningsih"', 'music': 'TEXT'
      };
      
      db.all("PRAGMA table_info(config)", (err, cols) => {
        if (!err && cols) {
          const existingColNames = cols.map(c => c.name);
          for (const [colName, colDef] of Object.entries(requiredColumns)) {
            if (!existingColNames.includes(colName)) {
              console.log(`Auto-healing database: Adding missing column ${colName}`);
              db.run(`ALTER TABLE config ADD COLUMN ${colName} ${colDef}`, () => {});
            }
          }
        }
        
        // Seed default config if entirely empty
        db.get(`SELECT * FROM config WHERE id = 1`, (err, row) => {
          if (!row) {
            db.run(`INSERT INTO config (id, couple_names, wedding_date, theme, akad_address, akad_maps, akad_time, resepsi_address, resepsi_maps, resepsi_time, bank_name, bank_account, gift_address, groom_photo, bride_photo, hero_bg, hero_photo, admin_username, admin_password, admin_name, admin_email, groom_parents, bride_parents) 
                    VALUES (1, 'Aris & Sri', '2026-12-12', 'elegant', 
                    'Masjid Raya Al-Jabar\\nJl. Cimincrang No.14\\nKota Bandung', 'https://maps.app.goo.gl/some-link', '08:00 WIB - Selesai',
                    'The Trans Luxury Hotel\\nJl. Gatot Subroto No.289\\nKota Bandung', 'https://maps.app.goo.gl/some-link', '11:00 WIB - Selesai',
                    'BCA - Aris', '1234567890',
                    'Jl. Ir. H. Juanda No. 123\\nKel. Dago, Kec. Coblong\\nBandung',
                    'https://images.unsplash.com/photo-1542652735873-fb2825bac6e2?w=400', 'https://images.unsplash.com/photo-1510342417-640f1a9a83eb?w=400',
                    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc', 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=600',
                    'admin', 'admin', 'Administrator', 'admin@uleman.com', 'Bpk. Suherman & Ibu Yanti', 'Bpk. Juhadi & Ibu Ningsih')`);
          }
        });
      });
    });

    // Create RSVPs Table
    db.run(`CREATE TABLE IF NOT EXISTS rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      guests INTEGER NOT NULL,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// ==========================================
// ROUTES
// ==========================================

// --- Root Status WebUI ---
app.get('/', (req, res) => {
  const start_time = new Date(Date.now() - process.uptime() * 1000).toLocaleString();
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Uleman Backend Status</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Outfit', sans-serif; background-color: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; background-image: radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(circle at 85% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 50%); }
        .card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 40px; width: 100%; max-width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); text-align: center; position: relative; }
        .pulse { position: absolute; top: 32px; right: 32px; width: 16px; height: 16px; background-color: #10b981; border-radius: 50%; box-shadow: 0 0 0 rgba(16, 185, 129, 0.7); animation: pulse 2s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
        h1 { font-size: 2rem; font-weight: 700; margin-bottom: 8px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        p { color: #94a3b8; font-size: 0.95rem; margin-bottom: 32px; }
        .info-grid { display: grid; gap: 16px; text-align: left; }
        .info-item { background: rgba(255, 255, 255, 0.03); padding: 16px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05); }
        .label { color: #94a3b8; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .value { font-weight: 600; color: #f8fafc; }
        .success { color: #10b981; display: flex; align-items: center; gap: 6px; }
        .success::before { content: ''; width: 8px; height: 8px; background: #10b981; border-radius: 50%; }
        .endpoints { margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); text-align: left; }
        .endpoint { display: inline-block; background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 6px 12px; border-radius: 8px; font-family: monospace; font-size: 0.85rem; margin-right: 8px; margin-bottom: 8px; border: 1px solid rgba(59, 130, 246, 0.2); }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="pulse"></div>
        <h1>Uleman Digital</h1>
        <p>Backend API Services & Database Engine</p>
        
        <div class="info-grid">
          <div class="info-item">
            <span class="label">System Status</span>
            <span class="value success">Online & Healthy</span>
          </div>
          <div class="info-item">
            <span class="label">Database Engine</span>
            <span class="value success">SQLite Connected</span>
          </div>
          <div class="info-item">
            <span class="label">Port Binding</span>
            <span class="value">${process.env.PORT || 5000}</span>
          </div>
          <div class="info-item">
            <span class="label">Uptime Since</span>
            <span class="value" style="font-size: 0.9rem">${start_time}</span>
          </div>
        </div>

        <div class="endpoints">
          <div class="label" style="margin-bottom: 12px">Available REST API Endpoints:</div>
          <span class="endpoint">GET /api/config</span>
          <span class="endpoint">POST /api/config</span>
          <span class="endpoint">GET /api/rsvps</span>
          <span class="endpoint">POST /api/rsvps</span>
        </div>
      </div>
    </body>
    </html>
  `);
});

// --- Config API ---
app.get('/api/config', (req, res) => {
  db.get(`SELECT * FROM config WHERE id = 1`, (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row);
  });
});

app.post('/api/config', upload.any(), (req, res) => {
  db.get(`SELECT * FROM config WHERE id = 1`, (err, oldConfig) => {
    if (err) return res.status(500).json({ error: err.message });
    
    let query = `UPDATE config SET `;
    const params = [];
    const fields = [];
    const filesToDelete = [];

    // Base text fields sent in req.body
    const allowedText = [
      'couple_names', 'wedding_date', 'theme', 'akad_address', 'akad_maps', 'akad_time', 
      'resepsi_address', 'resepsi_maps', 'resepsi_time', 'bank_name', 'bank_account', 
      'gift_address', 'admin_username', 'admin_password', 'admin_name', 'admin_email',
      'hero_bg', 'hero_photo', 'groom_photo', 'bride_photo', // Could be updated via basic text URL if not uploaded
      'groom_parents', 'bride_parents', 'music'
    ];

    allowedText.forEach(field => {
      if (req.body[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(req.body[field]);

        // Mark old file for deletion if it's being cleared/reset (e.g. music reset to "")
        if (oldConfig && oldConfig[field] && oldConfig[field].includes('/uploads/') && req.body[field] !== oldConfig[field]) {
          const oldRelativeName = oldConfig[field].split('/uploads/')[1];
          if (oldRelativeName) {
             const oldPath = path.join(uploadsDir, oldRelativeName);
             if (!filesToDelete.includes(oldPath)) filesToDelete.push(oldPath);
          }
        }
      }
    });

    // Check newly uploaded files
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const fieldName = file.fieldname;
        const newUrl = `/uploads/${file.filename}`;
        
        // Remove existing text update if overridden by file upload
        const fieldIndex = fields.findIndex(f => f === `${fieldName} = ?`);
        if (fieldIndex > -1) {
          params[fieldIndex] = newUrl;
        } else {
          fields.push(`${fieldName} = ?`);
          params.push(newUrl);
        }

        // Mark old file for deletion cleanly avoiding default seeded URLs or Unsplash URLs
        if (oldConfig && oldConfig[fieldName] && oldConfig[fieldName].includes('/uploads/')) {
          const oldRelativeName = oldConfig[fieldName].split('/uploads/')[1];
          if (oldRelativeName) {
             const oldPath = path.join(uploadsDir, oldRelativeName);
             filesToDelete.push(oldPath);
          }
        }
      });
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    query += fields.join(', ') + ` WHERE id = 1`;

    db.run(query, params, function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Cleanup locally stored old images
      filesToDelete.forEach(fPath => {
        if (fs.existsSync(fPath)) {
          fs.unlink(fPath, (err) => { if(err) console.error("Failed to delete", fPath) });
        }
      });

      res.json({ message: "Configuration updated successfully!" });
    });
  });
});

// --- RSVPs API ---
app.get('/api/rsvps', (req, res) => {
  db.all(`SELECT * FROM rsvps ORDER BY created_at DESC`, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/rsvps', (req, res) => {
  const { name, status, guests, message } = req.body;

  if (!name || !status || guests === undefined) {
    return res.status(400).json({ error: "Missing required fields: name, status, guests" });
  }

  const query = `INSERT INTO rsvps (name, status, guests, message) VALUES (?, ?, ?, ?)`;
  db.run(query, [name, status, guests, message || ''], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      id: this.lastID,
      name,
      status,
      guests,
      message: "RSVP submitted successfully!"
    });
  });
});

// DELETE single RSVP by ID
app.delete('/api/rsvps/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM rsvps WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'RSVP not found' });
    }
    res.json({ message: `RSVP with id ${id} deleted successfully.` });
  });
});

// DELETE all RSVPs (bulk delete)
app.delete('/api/rsvps', (req, res) => {
  db.run(`DELETE FROM rsvps`, [], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: `All RSVPs deleted. Total removed: ${this.changes}` });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
