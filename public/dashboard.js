// ── Dashboard client-side script ───────────────────────────────────

const REFRESH_MS = 5000;

// ─── Auth guard ───────────────────────────────────────────────────
async function checkAuth() {
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (!data.authenticated) {
            location.href = '/login.html';
            return false;
        }
        // Set username in sidebar
        const name = data.user || 'usuario';
        const nameEl = document.getElementById('user-name');
        const avEl = document.getElementById('user-avatar');
        if (nameEl) nameEl.textContent = name;
        if (avEl) avEl.textContent = name.charAt(0).toUpperCase();
        return true;
    } catch {
        location.href = '/login.html';
        return false;
    }
}

// ─── Animate counter ─────────────────────────────────────────────
function animateValue(el, from, to, duration = 600) {
    if (!el) return;
    const start = performance.now();
    function update(time) {
        const pct = Math.min((time - start) / duration, 1);
        const val = Math.floor(from + (to - from) * easeOut(pct));
        el.textContent = val.toLocaleString('es-ES');
        if (pct < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// ─── Bar chart ───────────────────────────────────────────────────
function renderChart(days) {
    const container = document.getElementById('bar-chart');
    if (!container) return;

    const max = Math.max(...days.map(d => d.count), 1);

    container.innerHTML = days.map(d => {
        const pct = Math.round((d.count / max) * 100);
        return `
      <div class="bar-col">
        <div class="bar-count">${d.count}</div>
        <div class="bar-wrapper">
          <div class="bar" style="height:${pct}%">
            <div class="bar-tooltip">${d.label}: ${d.count} visita${d.count !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="bar-label">${d.label}</div>
      </div>`;
    }).join('');
}

// ─── Fetch & render stats ─────────────────────────────────────────
let prevTotal = 0;

async function loadStats() {
    try {
        const res = await fetch('/api/stats');
        if (res.status === 401) { location.href = '/login.html'; return; }
        const data = await res.json();

        const today = new Date().toISOString().split('T')[0];
        const todayEntry = data.days.find(d => d.date === today);
        const todayCount = todayEntry ? todayEntry.count : 0;
        const weekTotal = data.days.reduce((s, d) => s + d.count, 0);
        const avg = Math.round(weekTotal / 7);

        animateValue(document.getElementById('stat-total'), prevTotal, data.total);
        animateValue(document.getElementById('stat-today'), 0, todayCount);
        animateValue(document.getElementById('stat-week'), 0, weekTotal);
        animateValue(document.getElementById('stat-avg'), 0, avg);
        prevTotal = data.total;

        renderChart(data.days);

        const upd = document.getElementById('last-update');
        if (upd) {
            const now = new Date();
            upd.textContent = `Última actualización: ${now.toLocaleTimeString('es-ES')}`;
        }
    } catch (err) {
        console.error('Error al cargar stats:', err);
    }
}

// ─── Logout ───────────────────────────────────────────────────────
document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/logout', { method: 'POST' });
    location.href = '/login.html';
});

// ─── Init ─────────────────────────────────────────────────────────
(async () => {
    const ok = await checkAuth();
    if (!ok) return;
    await loadStats();
    setInterval(loadStats, REFRESH_MS);
})();
