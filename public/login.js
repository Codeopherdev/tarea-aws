// ── Login page client-side script ──────────────────────────────────

const form = document.getElementById('login-form');
const btnLogin = document.getElementById('btn-login');
const btnText = document.getElementById('btn-text');
const alertEl = document.getElementById('alert-error');
const alertMsg = document.getElementById('alert-msg');

// If already logged in, go straight to dashboard
fetch('/api/me')
    .then(r => r.json())
    .then(data => { if (data.authenticated) location.href = '/dashboard.html'; })
    .catch(() => { });

function showError(msg) {
    alertMsg.textContent = msg;
    alertEl.classList.add('show');
    alertEl.className = 'alert alert-error show';
    setTimeout(() => alertEl.classList.remove('show'), 5000);
}

function setLoading(on) {
    btnLogin.classList.toggle('loading', on);
    btnText.textContent = on ? 'Iniciando sesión…' : 'Iniciar Sesión';
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertEl.classList.remove('show');

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showError('Por favor completa todos los campos.');
        return;
    }

    setLoading(true);
    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();

        if (data.success) {
            btnText.textContent = '✅ ¡Bienvenido!';
            setTimeout(() => { location.href = '/dashboard.html'; }, 600);
        } else {
            setLoading(false);
            showError(data.message || 'Error al iniciar sesión.');
        }
    } catch {
        setLoading(false);
        showError('No se pudo conectar con el servidor.');
    }
});

// Allow Enter key to submit
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') form.requestSubmit();
});
