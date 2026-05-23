let properties = [];
let bookings = [];
let session = JSON.parse(localStorage.getItem('stayinowSession') || 'null');
let currentFilter = 'all';
let systemMaintenance = false;
let pendingPropertyImage = '';
let pendingLogoImage = localStorage.getItem('siteLogoImage') || '';

const page = document.body.dataset.page || 'home';
const isAdminPage = page === 'admin';

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => [...document.querySelectorAll(selector)];
const rupiah = (n) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(Number(n || 0));

function typeLabel(type) {
  const map = { Villa: 'Villa', Apartment: 'Apartemen', HotelRoom: 'Kamar Hotel' };
  return map[type] || type || '-';
}

function statusLabel(status) {
  const map = {
    available: 'Tersedia',
    maintenance: 'Maintenance',
    paid: 'Lunas',
    pending: 'Menunggu',
    cancelled: 'Dibatalkan'
  };
  return map[status] || status || '-';
}

function safe(selector, callback) {
  const el = qs(selector);
  if (el) callback(el);
}

function toast(message) {
  const el = qs('#toast');
  if (!el) return alert(message);
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

function isLoggedIn() {
  return !!session;
}

function isAdmin() {
  return !!session && session.role === 'admin';
}

function saveSession(user) {
  session = user;
  localStorage.setItem('stayinowSession', JSON.stringify(user));
  renderSession();
}

function clearSession() {
  session = null;
  localStorage.removeItem('stayinowSession');
  renderSession();
}

function setLogoElement(el, logoText, logoImage) {
  if (logoImage) el.innerHTML = `<img src="${logoImage}" alt="Logo STAYINOW">`;
  else el.textContent = logoText;
}

function initBranding() {
  const name = localStorage.getItem('siteName') || 'STAYINOW';
  const logoText = localStorage.getItem('logoText') || 'SN';
  const logoImage = localStorage.getItem('siteLogoImage') || '';
  qsa('[data-site-name]').forEach(el => el.textContent = name);
  qsa('[data-brand-logo]').forEach(el => setLogoElement(el, logoText, logoImage));
  safe('#siteNameInput', el => el.value = name);
  safe('#logoTextInput', el => el.value = logoText);
  document.title = isAdminPage ? `Dasbor Admin - ${name}` : `${name} - Pemesanan Properti`;
}

function renderDrawerLinks() {
  const box = qs('#drawerLinks');
  if (!box) return;
  const links = [
    ['index.html', '🏠 Beranda'],
    ['index.html#properties', '🏡 Properti'],
    ['pemesanan.html', '🧾 Pemesanan'],
    ['riwayat.html', '📚 Riwayat']
  ];
  let html = links.map(([href, label]) => `<a href="${href}">${label}</a>`).join('');
  if (isAdmin()) html += `<a href="dasbor-admin.html">⚙️ Dasbor Admin</a><button type="button" onclick="logout()">🚪 Keluar</button>`;
  else if (session) html += `<button type="button" onclick="logout()">🚪 Keluar</button>`;
  else html += `<button type="button" onclick="openLogin()">🔐 Masuk</button>`;
  box.innerHTML = html;
}

function renderSession() {
  safe('#roleName', el => el.textContent = session ? (isAdmin() ? 'Administrator' : session.email) : 'Pengunjung');
  safe('#loginBtn', el => el.textContent = session ? (isAdmin() ? 'Admin' : 'Akun') : 'Masuk');
  renderDrawerLinks();
}

function openDrawer() {
  safe('#drawer', el => el.classList.add('open'));
  safe('#overlay', el => el.classList.add('show'));
}

function closeDrawer() {
  safe('#drawer', el => el.classList.remove('open'));
  safe('#overlay', el => el.classList.remove('show'));
}

function openLogin() {
  safe('#loginModal', el => el.classList.remove('hidden'));
  closeDrawer();
}

function closeLogin() {
  safe('#loginModal', el => el.classList.add('hidden'));
}

function logout() {
  clearSession();
  toast('Berhasil keluar.');
  if (isAdminPage) setTimeout(() => location.href = 'index.html', 300);
}

function imageFromProperty(property) {
  if (property.image_url) return `<img src="${property.image_url}" alt="${property.name}">`;
  return '';
}

function renderSystemMaintenance() {
  qsa('[data-system-maintenance]').forEach(el => el.classList.toggle('hidden', !systemMaintenance));
  safe('#systemMaintenanceStatus', el => el.textContent = systemMaintenance ? 'AKTIF - semua pemesanan ditutup' : 'NONAKTIF - pemesanan berjalan normal');
  safe('#systemMaintenanceToggle', el => {
    el.textContent = systemMaintenance ? 'Matikan Maintenance Sistem' : 'Aktifkan Maintenance Sistem';
    el.classList.toggle('danger', !systemMaintenance);
    el.classList.toggle('green', systemMaintenance);
  });
}

function renderProperties() {
  const grid = qs('#propertyGrid');
  if (!grid) return;
  const shown = currentFilter === 'all'
    ? properties
    : properties.filter(p => String(p.type).toLowerCase() === currentFilter.toLowerCase());

  grid.innerHTML = shown.map(p => {
    const blocked = systemMaintenance || p.status === 'maintenance';
    return `
      <article class="property-card">
        <div class="property-image">
          ${imageFromProperty(p)}
          <span class="badge ${p.status} image-badge">${statusLabel(p.status)}</span>
        </div>
        <div class="property-body">
          <h3>${p.name}</h3>
          <p class="muted">📍 ${p.location} • ${typeLabel(p.type)}</p>
          <div class="price-row">
            <div><span>Hari Biasa</span><b>${rupiah(p.weekday_price)}</b></div>
            <div><span>Akhir Pekan</span><b>${rupiah(p.weekend_price)}</b></div>
          </div>
          <p class="muted">⭐ ${p.rating || 4.8} • Max ${p.max_guests || 2} tamu</p>
          <button class="btn full ${blocked ? 'light' : ''}" ${blocked ? 'disabled' : ''} onclick="goPemesanan('${p.id}')">
            ${systemMaintenance ? 'Sistem Maintenance' : (p.status === 'maintenance' ? 'Sedang Maintenance' : 'Pesan Sekarang')}
          </button>
        </div>
      </article>
    `;
  }).join('') || `<div class="empty-state">Tidak ada properti untuk kategori ini.</div>`;
}

function fillPemesananOptions() {
  safe('#bookingProperty', el => {
    el.innerHTML = properties.map(p => `
      <option value="${p.id}" ${(systemMaintenance || p.status === 'maintenance') ? 'disabled' : ''}>
        ${p.name} - ${p.location}${p.status === 'maintenance' ? ' (Maintenance)' : ''}
      </option>
    `).join('');
    const selected = new URLSearchParams(location.search).get('property');
    if (selected) el.value = selected;
  });
}

function daysBetween(a, b) {
  return Math.ceil((new Date(b) - new Date(a)) / 86400000);
}

function estimatePrice(property, checkIn, checkOut) {
  let total = 0, weekday = 0, weekend = 0;
  let date = new Date(checkIn);
  const end = new Date(checkOut);
  while (date < end) {
    const day = date.getDay();
    if (day === 0 || day === 6) {
      total += Number(property.weekend_price);
      weekend++;
    } else {
      total += Number(property.weekday_price);
      weekday++;
    }
    date.setDate(date.getDate() + 1);
  }
  return { total, weekday, weekend };
}

function updatePricePreview() {
  const preview = qs('#pricePreview');
  if (!preview) return;
  const property = properties.find(p => String(p.id) === String(qs('#bookingProperty')?.value));
  const checkIn = qs('#checkIn')?.value;
  const checkOut = qs('#checkOut')?.value;
  if (!property || !checkIn || !checkOut) {
    preview.textContent = 'Pilih properti dan tanggal untuk melihat estimasi harga.';
    return;
  }
  const nights = daysBetween(checkIn, checkOut);
  if (nights <= 0) {
    preview.textContent = 'Check-out harus setelah check-in.';
    return;
  }
  const est = estimatePrice(property, checkIn, checkOut);
  preview.innerHTML = `${nights} malam • ${est.weekday} hari biasa + ${est.weekend} akhir pekan • Estimasi <strong>${rupiah(est.total)}</strong>`;
}

function renderPemesananDetail() {
  const box = qs('#bookingDetail');
  if (!box) return;
  const selectedId = qs('#bookingProperty')?.value || new URLSearchParams(location.search).get('property');
  const p = properties.find(x => String(x.id) === String(selectedId)) || properties[0];
  if (!p) {
    box.innerHTML = '<div class="empty-state">Pilih properti untuk melihat detail.</div>';
    return;
  }
  const facilities = Array.isArray(p.facilities)
    ? p.facilities
    : String(p.facilities || '').split(',').map(x => x.trim()).filter(Boolean);
  const facilityHtml = (facilities.length ? facilities : ['WiFi', 'AC', 'Kamar mandi', 'Area parkir']).map(x => `<span>${x}</span>`).join('');
  const roomGuess = p.type === 'Apartment' ? 2 : p.type === 'HotelRoom' ? 1 : Math.max(2, Math.ceil((p.max_guests || 4) / 2));
  const bedGuess = Math.max(1, Math.ceil((p.max_guests || 2) / 2));
  box.innerHTML = `
    <div class="detail-card">
      <div class="detail-gallery">
        <div class="detail-main-image">${imageFromProperty(p) || '<span>Foto Properti</span>'}</div>
        <div class="gallery-mini"><div>Kamar</div><div>Kolam</div><div>Ruang Tamu</div></div>
      </div>
      <div class="detail-info">
        <p class="eyebrow">Detail Properti</p>
        <h2>${p.name}</h2>
        <p class="muted">📍 ${p.location} • ${typeLabel(p.type)}</p>
        <div class="spec-grid">
          <div><b>${roomGuess}</b><span>Kamar</span></div>
          <div><b>${bedGuess}</b><span>Kasur</span></div>
          <div><b>${p.max_guests || 2}</b><span>Max Tamu</span></div>
          <div><b>${p.rating || 4.8}</b><span>Rating</span></div>
        </div>
        <div class="facility-list">${facilityHtml}</div>
        <div class="price-row">
          <div><span>Hari Biasa</span><b>${rupiah(p.weekday_price)}</b></div>
          <div><span>Akhir Pekan</span><b>${rupiah(p.weekend_price)}</b></div>
        </div>
        <p class="muted">Detail ini membantu pelanggan memilih properti sebelum melakukan pemesanan.</p>
      </div>
    </div>
  `;
}

function renderPemesanans() {
  const box = qs('#bookingList');
  if (!box) return;
  box.innerHTML = bookings.map(b => `
    <div class="booking-item">
      <div>
        <b>#${b.id} • ${b.property_name}</b>
        <p class="muted">${b.customer_name} • ${b.check_in} sampai ${b.check_out} • ${b.guests} tamu</p>
        <span class="badge ${b.status || 'paid'}">${statusLabel(b.status || 'paid')}</span>
      </div>
      <div>
        <b>${rupiah(b.total_price)}</b>
        <div class="receipt-actions">
          <button class="btn light small" onclick="showRiwayatReceipt('${b.id}')">Cetak</button>
          <a class="btn ghost small" href="${API.receiptTxtUrl(b.id)}" target="_blank">Unduh TXT</a>
        </div>
      </div>
    </div>
  `).join('') || `<div class="empty-state">Belum ada riwayat pemesanan.</div>`;
}

function makeReceiptHTML(b) {
  return `
    <div class="receipt" id="receiptPrintArea">
      <h3>Struk / Bukti Pemesanan</h3>
      <div class="receipt-row"><span>ID Pemesanan</span><strong>#${b.booking_id || b.id}</strong></div>
      <div class="receipt-row"><span>Pelanggan</span><strong>${b.customer_name}</strong></div>
      <div class="receipt-row"><span>Properti</span><strong>${b.property_name}</strong></div>
      <div class="receipt-row"><span>Check-in</span><strong>${b.check_in}</strong></div>
      <div class="receipt-row"><span>Check-out</span><strong>${b.check_out}</strong></div>
      <div class="receipt-row"><span>Tamu</span><strong>${b.guests}</strong></div>
      <div class="receipt-row"><span>Total</span><strong>${rupiah(b.total_price)}</strong></div>
      <div class="receipt-row"><span>Status</span><strong>${statusLabel(b.status || 'paid')}</strong></div>
      <div class="receipt-actions">
        <button class="btn light" onclick="window.print()">Cetak</button>
        ${(b.booking_id || b.id) ? `<a class="btn ghost" href="${API.receiptTxtUrl(b.booking_id || b.id)}" target="_blank">Unduh TXT</a>` : ''}
      </div>
    </div>
  `;
}

function showReceipt(b) {
  safe('#lastReceipt', el => el.innerHTML = makeReceiptHTML(b));
}

function showRiwayatReceipt(id) {
  const booking = bookings.find(b => String(b.id) === String(id));
  if (!booking) return toast('Data pemesanan tidak ditemukan.');
  safe('#receiptModalContent', el => el.innerHTML = makeReceiptHTML(booking));
  safe('#receiptModal', el => el.classList.remove('hidden'));
}

function closeReceiptModal() {
  safe('#receiptModal', el => el.classList.add('hidden'));
}

function renderAdmin(stats = {}) {
  safe('#statsGrid', el => {
    const cards = [
      ['Total Pemesanan', stats.total_bookings || 0],
      ['Pendapatan', rupiah(stats.revenue || 0)],
      ['Total Properti', stats.total_properties || properties.length],
      ['Maintenance', stats.maintenance_units || properties.filter(p => p.status === 'maintenance').length]
    ];
    el.innerHTML = cards.map(([title, value]) => `<div class="stat-card"><span>${title}</span><strong>${value}</strong></div>`).join('');
  });

  safe('#adminPropertyRows', el => {
    el.innerHTML = properties.map(p => `
      <tr>
        <td><b>${p.name}</b><br><span class="muted">${p.location}</span></td>
        <td>${typeLabel(p.type)}</td>
        <td><span class="badge ${p.status}">${statusLabel(p.status)}</span></td>
        <td><button class="btn light small" onclick="toggleMaintenance('${p.id}', '${p.status}')">Set ${p.status === 'maintenance' ? 'Tersedia' : 'Maintenance'}</button></td>
      </tr>
    `).join('');
  });
}

function goPemesanan(id) {
  if (systemMaintenance) return toast('Sistem sedang maintenance. Pemesanan ditutup sementara.');
  if (!isLoggedIn()) {
    openLogin();
    return toast('Silakan masuk/daftar dulu sebelum memesan.');
  }
  location.href = `pemesanan.html?property=${encodeURIComponent(id)}`;
}

function stepValue(id, delta) {
  const el = qs('#' + id);
  if (!el) return;
  const next = Math.max(1, Math.min(10, Number(el.value || 1) + Number(delta)));
  el.value = next;
  updatePricePreview();
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadData() {
  try {
    const maintenanceInfo = await API.getSystemMaintenance();
    systemMaintenance = !!maintenanceInfo.maintenance;
    properties = await API.getProperties();
    bookings = await API.getPemesanans();
    let stats = {};
    try { stats = await API.getStats(); } catch (_) {}
    renderSystemMaintenance();
    renderProperties();
    fillPemesananOptions();
    renderPemesananDetail();
    renderPemesanans();
    renderAdmin(stats);
    updatePricePreview();
  } catch (err) {
    toast('Backend belum aktif / error: ' + err.message);
  }
}

async function toggleMaintenance(id, current) {
  if (!isAdmin()) return toast('Hanya admin.');
  const next = current === 'maintenance' ? 'available' : 'maintenance';
  try {
    await API.updateMaintenance(id, next);
    toast('Status berhasil diubah.');
    await loadData();
  } catch (err) {
    toast(err.message);
  }
}

async function handleAddProperty(event) {
  event.preventDefault();
  if (!isAdmin()) return toast('Hanya admin.');
  const payload = {
    name: qs('#newPropertyName').value,
    location: qs('#newPropertyLocation').value,
    type: qs('#newPropertyType').value,
    weekday_price: Number(qs('#newWeekdayPrice').value),
    weekend_price: Number(qs('#newWeekendPrice').value),
    status: qs('#newPropertyStatus').value,
    max_guests: Number(qs('#newMaxGuests').value || 2),
    facilities: qs('#newFacilities').value,
    image_url: pendingPropertyImage
  };
  try {
    await API.createProperty(payload);
    toast('Properti berhasil ditambahkan.');
    pendingPropertyImage = '';
    event.target.reset();
    safe('#propertyImagePreview', img => img.removeAttribute('src'));
    await loadData();
    showAdminSection('properties');
  } catch (err) {
    toast(err.message);
  }
}

async function handleLogin() {
  const email = qs('#loginEmail')?.value.trim();
  const password = qs('#loginPassword')?.value || '';
  if (!email) return toast('Email wajib diisi.');
  try {
    const user = await API.login({ email, password });
    saveSession(user);
    closeLogin();
    toast(user.role === 'admin' ? 'Masuk admin berhasil.' : 'Masuk berhasil.');
    safe('#customerEmail', el => el.value = user.email || '');
    safe('#customerName', el => el.value = user.name || '');
    safe('#customerPhone', el => el.value = user.phone || '');
    if (user.role === 'admin') setTimeout(() => location.href = 'dasbor-admin.html', 500);
  } catch (err) {
    toast(err.message);
  }
}

async function handleRegister() {
  const payload = {
    name: qs('#registerName')?.value.trim(),
    email: qs('#registerEmail')?.value.trim(),
    phone: qs('#registerPhone')?.value.trim(),
    password: qs('#registerPassword')?.value || 'user123'
  };
  try {
    const user = await API.register(payload);
    saveSession(user);
    closeLogin();
    toast('Daftar berhasil. Kamu sudah masuk.');
    safe('#customerEmail', el => el.value = user.email || '');
    safe('#customerName', el => el.value = user.name || '');
    safe('#customerPhone', el => el.value = user.phone || '');
  } catch (err) {
    toast(err.message);
  }
}

function switchAuthMode(mode) {
  qsa('[data-auth-panel]').forEach(el => el.classList.toggle('hidden', el.dataset.authPanel !== mode));
  qsa('[data-auth-tab]').forEach(el => el.classList.toggle('active', el.dataset.authTab === mode));
}

function protectAdminPage() {
  if (isAdminPage && !isAdmin()) {
    alert('Silakan login sebagai admin dulu.');
    location.href = 'index.html';
  }
}

function openAdminDrawer() {
  safe('#adminDrawer', el => el.classList.add('open'));
  safe('#overlay', el => el.classList.add('show'));
}

function closeAdminDrawer() {
  safe('#adminDrawer', el => el.classList.remove('open'));
  if (!qs('#drawer')?.classList.contains('open')) safe('#overlay', el => el.classList.remove('show'));
}

function showAdminSection(name) {
  qsa('.admin-section').forEach(section => section.classList.remove('active'));
  safe(`#admin-${name}`, el => el.classList.add('active'));
  qsa('[data-admin-target]').forEach(btn => btn.classList.toggle('active', btn.dataset.adminTarget === name));
  const titles = {
    dashboard: 'Dasbor Admin',
    properties: 'Kelola Properti',
    reports: 'Laporan',
    branding: 'Identitas Website'
  };
  safe('#adminTitle', el => el.textContent = titles[name] || 'Admin');
  closeAdminDrawer();
}

function bindEvents() {
  safe('#drawerOpen', el => el.addEventListener('click', openDrawer));
  safe('#drawerClose', el => el.addEventListener('click', closeDrawer));
  safe('#overlay', el => el.addEventListener('click', () => { closeDrawer(); closeAdminDrawer(); }));
  safe('#loginBtn', el => el.addEventListener('click', openLogin));
  safe('#closeLogin', el => el.addEventListener('click', closeLogin));
  safe('#doLogin', el => el.addEventListener('click', handleLogin));
  safe('#doRegister', el => el.addEventListener('click', handleRegister));
  qsa('[data-auth-tab]').forEach(btn => btn.addEventListener('click', () => switchAuthMode(btn.dataset.authTab)));

  safe('#systemMaintenanceToggle', el => el.addEventListener('click', async () => {
    if (!isAdmin()) return toast('Hanya admin.');
    try {
      const result = await API.setSystemMaintenance(!systemMaintenance);
      systemMaintenance = !!result.maintenance;
      renderSystemMaintenance();
      renderProperties();
      fillPemesananOptions();
      toast(systemMaintenance ? 'Maintenance sistem aktif.' : 'Maintenance sistem dimatikan.');
    } catch (err) {
      toast(err.message);
    }
  }));

  qsa('[data-step]').forEach(btn => btn.addEventListener('click', () => stepValue(btn.dataset.step, btn.dataset.delta)));
  qsa('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    qsa('[data-filter]').forEach(x => x.classList.toggle('active', x === btn));
    renderProperties();
    location.hash = 'properties';
  }));

  safe('#searchForm', el => el.addEventListener('submit', event => {
    event.preventDefault();
    location.href = 'index.html#properties';
    toast('Silakan pilih properti yang tersedia.');
  }));

  safe('#refreshProperties', el => el.addEventListener('click', loadData));
  ['#bookingProperty', '#checkIn', '#checkOut'].forEach(selector => safe(selector, el => el.addEventListener('change', () => {
    updatePricePreview();
    renderPemesananDetail();
  })));

  safe('#closeReceiptModal', el => el.addEventListener('click', closeReceiptModal));

  safe('#bookingForm', el => el.addEventListener('submit', async event => {
    event.preventDefault();
    if (systemMaintenance) return toast('Sistem sedang maintenance. Pemesanan ditutup sementara.');
    if (!isLoggedIn()) {
      openLogin();
      return toast('Silakan masuk/daftar dulu sebelum memesan.');
    }
    try {
      const payload = {
        property_id: qs('#bookingProperty').value,
        customer_name: qs('#customerName').value,
        customer_email: qs('#customerEmail').value,
        customer_phone: qs('#customerPhone').value,
        check_in: qs('#checkIn').value,
        check_out: qs('#checkOut').value,
        guests: Number(qs('#guests').value),
        payment_method: qs('#paymentMethod').value
      };
      const result = await API.createPemesanan(payload);
      toast('Pemesanan berhasil.');
      showReceipt(result);
      await loadData();
    } catch (err) {
      toast(err.message);
    }
  }));

  safe('#adminDrawerOpen', el => el.addEventListener('click', openAdminDrawer));
  safe('#adminDrawerClose', el => el.addEventListener('click', closeAdminDrawer));
  safe('#adminMenuShortcut', el => el.addEventListener('click', openAdminDrawer));
  qsa('[data-admin-target]').forEach(btn => btn.addEventListener('click', () => showAdminSection(btn.dataset.adminTarget)));
  safe('#adminKeluar', el => el.addEventListener('click', logout));
  safe('#downloadReport', el => el.addEventListener('click', () => window.open(API.reportUrl(), '_blank')));
  safe('#downloadReportTxt', el => el.addEventListener('click', () => window.open(API.reportTxtUrl(), '_blank')));
  safe('#addPropertyForm', el => el.addEventListener('submit', handleAddProperty));

  safe('#propertyImageInput', el => el.addEventListener('change', async () => {
    if (el.files[0]) {
      pendingPropertyImage = await fileToDataUrl(el.files[0]);
      safe('#propertyImagePreview', img => img.src = pendingPropertyImage);
    }
  }));

  safe('#logoImageInput', el => el.addEventListener('change', async () => {
    if (el.files[0]) {
      pendingLogoImage = await fileToDataUrl(el.files[0]);
      initBranding();
      toast('Logo dipilih. Klik Simpan Branding.');
    }
  }));

  safe('#saveBranding', el => el.addEventListener('click', () => {
    localStorage.setItem('siteName', qs('#siteNameInput').value || 'STAYINOW');
    localStorage.setItem('logoText', qs('#logoTextInput').value || 'SN');
    if (pendingLogoImage) localStorage.setItem('siteLogoImage', pendingLogoImage);
    initBranding();
    toast('Branding disimpan.');
  }));

  safe('#resetBranding', el => el.addEventListener('click', () => {
    localStorage.removeItem('siteName');
    localStorage.removeItem('logoText');
    localStorage.removeItem('siteLogoImage');
    pendingLogoImage = '';
    initBranding();
    toast('Branding direset.');
  }));
}

document.addEventListener('DOMContentLoaded', () => {
  protectAdminPage();
  initBranding();
  renderSession();
  bindEvents();
  loadData();
});
