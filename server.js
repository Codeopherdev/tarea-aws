const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'visits.json');

// ─── Ensure data directory exists ───────────────────────────────────────────
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ total: 0, daily: {} }));
}

// ─── Demo users (password hashed) ───────────────────────────────────────────
const USERS = {
  admin: bcrypt.hashSync('admin123', 10),
  usuario: bcrypt.hashSync('pass123', 10),
};

// ─── Helper: read/write visits ────────────────────────────────────────────────
function readVisits() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeVisits(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function recordVisit() {
  const data = readVisits();
  data.total += 1;
  const today = new Date().toISOString().split('T')[0];
  data.daily[today] = (data.daily[today] || 0) + 1;
  writeVisits(data);
}

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'visitas_secreto_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }, // 1 hour
  })
);

// Count every page visit (before static files)
app.use((req, res, next) => {
  // Only count HTML page loads, not API/asset calls
  if (
    req.method === 'GET' &&
    !req.path.startsWith('/api') &&
    !req.path.match(/\.(css|js|ico|png|jpg|svg)$/)
  ) {
    recordVisit();
  }
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ─── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'No autenticado' });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Root → login page
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const hash = USERS[username];
  if (!hash || !bcrypt.compareSync(password, hash)) {
    return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
  }
  req.session.user = username;
  res.json({ success: true, message: '¡Bienvenido!' });
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Check session
app.get('/api/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ authenticated: true, user: req.session.user });
  }
  res.json({ authenticated: false });
});

// Visit stats (protected)
app.get('/api/visits', requireAuth, (req, res) => {
  const data = readVisits();
  res.json(data);
});

// Last 7 days stats (protected)
app.get('/api/stats', requireAuth, (req, res) => {
  const data = readVisits();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
    days.push({ date: key, label, count: data.daily[key] || 0 });
  }
  res.json({ total: data.total, days });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`   Usuarios de prueba:`);
  console.log(`   • admin / admin123`);
  console.log(`   • usuario / pass123\n`);
});
