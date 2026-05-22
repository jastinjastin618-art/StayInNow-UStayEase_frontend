let properties = [];
let bookings = [];
let session = JSON.parse(localStorage.getItem('ustaySession') || 'null');
let pendingLogoImage = localStorage.getItem('siteLogoImage') || '';
let pendingPropertyImage = '';
let currentFilter = 'all';
let systemMaintenance = false;
const page = document.body.dataset.page || 'home';
const isAdminPage = page === 'admin';

const qs = (s) => document.querySelector(s);
const qsa = (s) => [...document.querySelectorAll(s)];
const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0));

function toast(message) {
  const el = qs('#toast');
  if (!el) return alert(message);
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
function safe(sel, fn) { const el = qs(sel); if (el) fn(el); }
function isAdmin() { return session && session.role === 'admin'; }
function isLoggedIn() { return !!session; }
function saveSession(data) { session = data; localStorage.setItem('ustaySession', JSON.stringify(data)); renderSession(); }
function clearSession() { session = null; localStorage.removeItem('ustaySession'); renderSession(); }

function setLogoElement(el, logoText, logoImage) {
  if (logoImage) el.innerHTML = `<img src="${logoImage}" alt="Logo">`;
  else el.textContent = logoText;
}
function initBranding() {
  const name = localStorage.getItem('siteName') || 'UStayEase';
  const logoText = localStorage.getItem('logoText') || 'US';
  const logoImage = localStorage.getItem('siteLogoImage') || '';
  qsa('[data-site-name]').forEach(el => el.textContent = name);
  qsa('[data-brand-logo]').forEach(el => setLogoElement(el, logoText, logoImage));
  safe('#siteNameInput', el => el.value = name);
  safe('#logoTextInput', el => el.value = logoText);
  document.title = isAdminPage ? `Admin Dashboard - ${name}` : `${name} - Booking Property`;
}

function renderSession() {
  safe('#roleName', el => el.textContent = session ? (isAdmin() ? 'Administrator' : session.email) : 'Pengunjung');
  safe('#loginBtn', el => el.textContent = session ? (isAdmin() ? 'Admin' : 'Akun') : 'Login');
  renderDrawerLinks();
}
function renderDrawerLinks() {
  const box = qs('#drawerLinks'); if (!box) return;
  const links = [
    ['index.html', '🏠 Home'],
    ['index.html#properties', '🏡 Lihat Property'],
    ['booking.html', '🧾 Booking'],
    ['history.html', '📚 Riwayat Booking']
  ];
  let html = links.map(([href,label]) => `<a href="${href}">${label}</a>`).join('');
  if (isAdmin()) html += `<a href="admin.html">⚙️ Dashboard Admin</a><button type="button" onclick="logout()">🚪 Logout</button>`;
  else if (session) html += `<button type="button" onclick="logout()">🚪 Logout User</button>`;
  else html += `<button type="button" onclick="openLogin()">🔐 Login</button>`;
  box.innerHTML = html;
}
function openDrawer(){ safe('#drawer', el => el.classList.add('open')); safe('#overlay', el => el.classList.add('show')); }
function closeDrawer(){ safe('#drawer', el => el.classList.remove('open')); safe('#overlay', el => el.classList.remove('show')); }
function openLogin(){ safe('#loginModal', el => el.classList.remove('hidden')); closeDrawer(); }
function closeLogin(){ safe('#loginModal', el => el.classList.add('hidden')); }
function logout(){ clearSession(); toast('Logout berhasil.'); if(isAdminPage) setTimeout(()=>location.href='index.html',300); }


function renderSystemMaintenance(){
  qsa('[data-system-maintenance]').forEach(el => {
    el.classList.toggle('hidden', !systemMaintenance);
  });
  safe('#systemMaintenanceStatus', el => el.textContent = systemMaintenance ? 'AKTIF - semua booking ditutup' : 'NONAKTIF - booking berjalan normal');
  safe('#systemMaintenanceToggle', el => {
    el.textContent = systemMaintenance ? 'Matikan Maintenance Sistem' : 'Aktifkan Maintenance Sistem';
    el.classList.toggle('danger', !systemMaintenance);
    el.classList.toggle('green', systemMaintenance);
  });
}
function imageFromProperty(p){
  if (p.image_url) return `<img src="${p.image_url}" alt="${p.name}">`;
  return '';
}
function renderProperties(){
  const grid = qs('#propertyGrid'); if(!grid) return;
  const shown = currentFilter === 'all' ? properties : properties.filter(p => String(p.type).toLowerCase() === currentFilter.toLowerCase());
  const blocked = systemMaintenance;
  grid.innerHTML = shown.map(p => `<article class="property-card"><div class="property-image">${imageFromProperty(p)}<span class="badge ${p.status} image-badge">${p.status === 'maintenance' ? 'Maintenance' : 'Available'}</span></div><div class="property-body"><h3>${p.name}</h3><p class="muted">📍 ${p.location} • ${p.type}</p><div class="price-row"><div><span>Weekday</span><b>${rupiah(p.weekday_price)}</b></div><div><span>Weekend</span><b>${rupiah(p.weekend_price)}</b></div></div><p class="muted">⭐ ${p.rating || 4.8} • Max ${p.max_guests || 2} tamu</p><button class="btn full ${(blocked || p.status === 'maintenance') ? 'light' : ''}" ${(blocked || p.status === 'maintenance') ? 'disabled' : ''} onclick="goBooking('${p.id}')">${blocked ? 'Sistem Maintenance' : (p.status === 'maintenance' ? 'Sedang Maintenance' : 'Booking')}</button></div></article>`).join('') || `<div class="empty-state">Tidak ada property untuk kategori ini.</div>`;
}

function fillBookingOptions(){
  safe('#bookingProperty', el => {
    el.innerHTML = properties.map(p => `<option value="${p.id}" ${(systemMaintenance || p.status === 'maintenance') ? 'disabled' : ''}>${p.name} - ${p.location}${p.status === 'maintenance' ? ' (Maintenance)' : ''}</option>`).join('');
    const params = new URLSearchParams(location.search);
    const selected = params.get('property');
    if (selected) el.value = selected;
  });
}
function renderBookings(){
  const box = qs('#bookingList'); if(!box) return;
  box.innerHTML = bookings.map(b => `<div class="booking-item"><div><b>#${b.id} • ${b.property_name}</b><p class="muted">${b.customer_name} • ${b.check_in} sampai ${b.check_out} • ${b.guests} tamu</p><span class="badge ${b.status || 'paid'}">${b.status || 'paid'}</span></div><div><b>${rupiah(b.total_price)}</b><div class="receipt-actions"><button class="btn light small" onclick="showHistoryReceipt('${b.id}')">Cetak</button><a class="btn ghost small" href="${API.receiptTxtUrl(b.id)}" target="_blank">Download TXT</a></div></div></div>`).join('') || `<div class="empty-state">Belum ada riwayat booking.</div>`;
}
function showHistoryReceipt(id){
  const b = bookings.find(x => String(x.id) === String(id));
  if(!b) return toast('Data booking tidak ditemukan.');
  safe('#receiptModalContent', el => el.innerHTML = makeReceiptHTML(b));
  safe('#receiptModal', el => el.classList.remove('hidden'));
}
function closeReceiptModal(){ safe('#receiptModal', el => el.classList.add('hidden')); }

function renderAdmin(stats={}){
  safe('#statsGrid', el => {
    const cards = [['Total Booking', stats.total_bookings || 0], ['Revenue', rupiah(stats.revenue || 0)], ['Properties', stats.total_properties || properties.length], ['Maintenance', stats.maintenance_units || properties.filter(p=>p.status==='maintenance').length]];
    el.innerHTML = cards.map(([a,b]) => `<div class="stat-card"><span>${a}</span><strong>${b}</strong></div>`).join('');
  });
  const rows = properties.map(p => `<tr><td><b>${p.name}</b><br><span class="muted">${p.location}</span></td><td>${p.type}</td><td><span class="badge ${p.status}">${p.status}</span></td><td><button class="btn light small" onclick="toggleMaintenance('${p.id}','${p.status}')">Set ${p.status === 'maintenance' ? 'Available' : 'Maintenance'}</button></td></tr>`).join('');
  safe('#adminPropertyRows', el => el.innerHTML = rows);
}

function goBooking(id){ if(systemMaintenance) return toast('Sistem sedang maintenance. Booking ditutup sementara.'); if(!isLoggedIn()){ openLogin(); return toast('Silakan daftar/login email dulu sebelum booking.'); } location.href = `booking.html?property=${encodeURIComponent(id)}`; }
function daysBetween(a,b){ return Math.ceil((new Date(b) - new Date(a)) / 86400000); }
function estimatePrice(property, checkIn, checkOut){ let total=0, weekday=0, weekend=0; let d=new Date(checkIn); const end=new Date(checkOut); while(d<end){ const day=d.getDay(); if(day===0||day===6){ total+=Number(property.weekend_price); weekend++; } else { total+=Number(property.weekday_price); weekday++; } d.setDate(d.getDate()+1); } return {total,weekday,weekend}; }
function updatePricePreview(){
  const preview = qs('#pricePreview'); if(!preview) return;
  const p = properties.find(x => String(x.id) === String(qs('#bookingProperty')?.value));
  const ci = qs('#checkIn')?.value, co = qs('#checkOut')?.value;
  if(!p || !ci || !co){ preview.textContent = 'Pilih property dan tanggal untuk melihat estimasi harga.'; return; }
  const nights = daysBetween(ci,co);
  if(nights <= 0){ preview.textContent = 'Check-out harus setelah check-in.'; return; }
  const est = estimatePrice(p,ci,co);
  preview.innerHTML = `${nights} malam • ${est.weekday} weekday + ${est.weekend} weekend • Estimasi <strong>${rupiah(est.total)}</strong>`;
}
function renderBookingDetail(){
  const box = qs('#bookingDetail'); if(!box) return;
  const selectedId = qs('#bookingProperty')?.value || new URLSearchParams(location.search).get('property');
  const p = properties.find(x => String(x.id) === String(selectedId)) || properties[0];
  if(!p){ box.innerHTML = '<div class="empty-state">Pilih property untuk melihat detail.</div>'; return; }
  const facilities = Array.isArray(p.facilities) ? p.facilities : String(p.facilities || '').split(',').map(x=>x.trim()).filter(Boolean);
  const facilityHtml = (facilities.length ? facilities : ['WiFi', 'AC', 'Kamar mandi', 'Area parkir']).map(x => `<span>${x}</span>`).join('');
  const roomGuess = p.type === 'Apartment' ? 2 : p.type === 'HotelRoom' ? 1 : Math.max(2, Math.ceil((p.max_guests || 4)/2));
  const bedGuess = Math.max(1, Math.ceil((p.max_guests || 2)/2));
  box.innerHTML = `<div class="detail-card"><div class="detail-gallery"><div class="detail-main-image">${imageFromProperty(p) || '<span>Foto Property</span>'}</div><div class="gallery-mini"><div>Bedroom</div><div>Pool</div><div>Living Room</div></div></div><div class="detail-info"><p class="eyebrow">Detail Property</p><h2>${p.name}</h2><p class="muted">📍 ${p.location} • ${p.type}</p><div class="spec-grid"><div><b>${roomGuess}</b><span>Kamar</span></div><div><b>${bedGuess}</b><span>Kasur</span></div><div><b>${p.max_guests || 2}</b><span>Max Tamu</span></div><div><b>${p.rating || 4.8}</b><span>Rating</span></div></div><div class="facility-list">${facilityHtml}</div><div class="price-row"><div><span>Weekday</span><b>${rupiah(p.weekday_price)}</b></div><div><span>Weekend</span><b>${rupiah(p.weekend_price)}</b></div></div><p class="muted">Bagian ini bisa kamu isi foto kamar, kolam renang, ruang tamu, dan detail lain agar customer punya gambaran sebelum booking.</p></div></div>`;
}

function makeReceiptHTML(b){ return `<div class="receipt" id="receiptPrintArea"><h3>Struk / Bukti Pemesanan</h3><div class="receipt-row"><span>Booking ID</span><strong>#${b.booking_id || b.id}</strong></div><div class="receipt-row"><span>Customer</span><strong>${b.customer_name}</strong></div><div class="receipt-row"><span>Property</span><strong>${b.property_name}</strong></div><div class="receipt-row"><span>Check-in</span><strong>${b.check_in}</strong></div><div class="receipt-row"><span>Check-out</span><strong>${b.check_out}</strong></div><div class="receipt-row"><span>Guests</span><strong>${b.guests}</strong></div><div class="receipt-row"><span>Total</span><strong>${rupiah(b.total_price)}</strong></div><div class="receipt-row"><span>Status</span><strong>${b.status || 'paid'}</strong></div><div class="receipt-actions"><button class="btn light" onclick="window.print()">Print</button>${(b.booking_id || b.id) ? `<a class="btn ghost" href="${API.receiptTxtUrl(b.booking_id || b.id)}" target="_blank">Download TXT</a>` : ''}</div></div>`; }
function showReceipt(b){ safe('#lastReceipt', el => el.innerHTML = makeReceiptHTML(b)); }
function stepValue(id, delta){ const el=qs('#'+id); if(!el) return; const current=Number(el.value||1); const next=Math.max(1,Math.min(10,current+Number(delta))); el.value=next; updatePricePreview(); }

async function fileToDataUrl(file){ return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(file); }); }
async function loadData(){
  try{
    const maintenanceInfo = await API.getSystemMaintenance();
    systemMaintenance = !!maintenanceInfo.maintenance;
    properties = await API.getProperties();
    bookings = await API.getBookings();
    let stats={}; try{ stats = await API.getStats(); }catch(_){ }
    renderSystemMaintenance(); renderProperties(); fillBookingOptions(); renderBookingDetail(); renderBookings(); renderAdmin(stats); updatePricePreview();
  }catch(e){ toast('Backend belum aktif / error: ' + e.message); }
}
async function toggleMaintenance(id,current){
  if(!isAdmin()) return toast('Hanya admin.');
  const next = current === 'maintenance' ? 'available' : 'maintenance';
  try{ await API.updateMaintenance(id,next); toast('Status berhasil diubah.'); await loadData(); }catch(e){ toast(e.message); }
}
async function handleAddProperty(e){
  e.preventDefault();
  if(!isAdmin()) return toast('Hanya admin.');
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
  try{ await API.createProperty(payload); toast('Property berhasil ditambahkan.'); pendingPropertyImage=''; e.target.reset(); safe('#propertyImagePreview', img => img.removeAttribute('src')); await loadData(); showAdminSection('properties'); }catch(err){ toast(err.message); }
}
async function handleLogin(){
  const email = qs('#loginEmail')?.value.trim();
  const pass = qs('#loginPassword')?.value || '';
  if(!email) return toast('Email wajib diisi.');
  try{
    const user = await API.login({email, password: pass});
    saveSession(user); closeLogin(); toast(user.role === 'admin' ? 'Login admin berhasil.' : 'Login user berhasil.');
    safe('#customerEmail', el => el.value = user.email);
    safe('#customerName', el => el.value = user.name || '');
    safe('#customerPhone', el => el.value = user.phone || '');
    if(user.role === 'admin') setTimeout(()=>location.href='admin.html',500);
  }catch(err){ toast(err.message); }
}
async function handleRegister(){
  const payload = {
    name: qs('#registerName')?.value.trim(),
    email: qs('#registerEmail')?.value.trim(),
    phone: qs('#registerPhone')?.value.trim(),
    password: qs('#registerPassword')?.value || 'user123'
  };
  try{
    const user = await API.register(payload);
    saveSession(user); closeLogin(); toast('Daftar berhasil. Kamu sudah login.');
    safe('#customerEmail', el => el.value = user.email);
    safe('#customerName', el => el.value = user.name || '');
    safe('#customerPhone', el => el.value = user.phone || '');
  }catch(err){ toast(err.message); }
}
function switchAuthMode(mode){
  qsa('[data-auth-panel]').forEach(el => el.classList.toggle('hidden', el.dataset.authPanel !== mode));
  qsa('[data-auth-tab]').forEach(el => el.classList.toggle('active', el.dataset.authTab === mode));
}
function protectAdminPage(){ if(isAdminPage && !isAdmin()){ alert('Silakan login sebagai admin dulu.'); location.href='index.html'; } }
function showAdminSection(name){
  qsa('.admin-section').forEach(s => s.classList.remove('active'));
  safe(`#admin-${name}`, el => el.classList.add('active'));
  qsa('[data-admin-target]').forEach(btn => btn.classList.toggle('active', btn.dataset.adminTarget === name));
  const titleMap={dashboard:'Dashboard Admin',properties:'Kelola Property',reports:'Laporan',branding:'Branding'};
  safe('#adminTitle', el => el.textContent = titleMap[name] || 'Admin');
  closeAdminDrawer();
}
function openAdminDrawer(){ safe('#adminDrawer', el => el.classList.add('open')); safe('#overlay', el => el.classList.add('show')); }
function closeAdminDrawer(){ safe('#adminDrawer', el => el.classList.remove('open')); if(!qs('#drawer')?.classList.contains('open')) safe('#overlay', el => el.classList.remove('show')); }

function bindEvents(){
  safe('#drawerOpen', el => el.addEventListener('click',openDrawer));
  safe('#drawerClose', el => el.addEventListener('click',closeDrawer));
  safe('#overlay', el => el.addEventListener('click',()=>{closeDrawer();closeAdminDrawer();}));
  safe('#loginBtn', el => el.addEventListener('click',openLogin));
  safe('#closeLogin', el => el.addEventListener('click',closeLogin));
  safe('#doLogin', el => el.addEventListener('click',handleLogin));
  safe('#doRegister', el => el.addEventListener('click',handleRegister));
  qsa('[data-auth-tab]').forEach(btn => btn.addEventListener('click',()=>switchAuthMode(btn.dataset.authTab)));
  safe('#systemMaintenanceToggle', el => el.addEventListener('click', async ()=>{ if(!isAdmin()) return toast('Hanya admin.'); try{ const res = await API.setSystemMaintenance(!systemMaintenance); systemMaintenance = !!res.maintenance; renderSystemMaintenance(); renderProperties(); fillBookingOptions(); toast(systemMaintenance ? 'Maintenance sistem aktif. Semua booking ditutup.' : 'Maintenance sistem dimatikan. Status property kembali sesuai data awal.'); }catch(err){ toast(err.message); } }));
  qsa('[data-step]').forEach(btn => btn.addEventListener('click',()=>stepValue(btn.dataset.step,btn.dataset.delta)));
  qsa('[data-filter]').forEach(btn => btn.addEventListener('click',()=>{ currentFilter = btn.dataset.filter; qsa('[data-filter]').forEach(x=>x.classList.toggle('active', x===btn)); renderProperties(); location.hash='properties'; }));
  safe('#searchForm', el => el.addEventListener('submit',e=>{ e.preventDefault(); location.href='index.html#properties'; toast('Silakan pilih property yang tersedia.'); }));
  safe('#refreshProperties', el => el.addEventListener('click',loadData));
  ['#bookingProperty','#checkIn','#checkOut'].forEach(sel => safe(sel, el => el.addEventListener('change',()=>{ updatePricePreview(); renderBookingDetail(); })));
  safe('#closeReceiptModal', el => el.addEventListener('click',closeReceiptModal));
  safe('#bookingForm', el => el.addEventListener('submit', async e => { e.preventDefault(); if(systemMaintenance) return toast('Sistem sedang maintenance. Booking ditutup sementara.'); if(!isLoggedIn()){ openLogin(); return toast('Silakan daftar/login dulu sebelum booking.'); } try{ const payload={ property_id: qs('#bookingProperty').value, customer_name: qs('#customerName').value, customer_email: qs('#customerEmail').value, customer_phone: qs('#customerPhone').value, check_in: qs('#checkIn').value, check_out: qs('#checkOut').value, guests: Number(qs('#guests').value), payment_method: qs('#paymentMethod').value }; const result=await API.createBooking(payload); toast('Booking berhasil.'); showReceipt(result); await loadData(); }catch(err){ toast(err.message); } }));
  safe('#adminDrawerOpen', el => el.addEventListener('click',openAdminDrawer));
  safe('#adminDrawerClose', el => el.addEventListener('click',closeAdminDrawer));
  safe('#adminMenuShortcut', el => el.addEventListener('click',openAdminDrawer));
  qsa('[data-admin-target]').forEach(btn => btn.addEventListener('click',()=>showAdminSection(btn.dataset.adminTarget)));
  safe('#adminLogout', el => el.addEventListener('click',logout));
  safe('#downloadReport', el => el.addEventListener('click',()=>window.open(API.reportUrl(),'_blank')));
  safe('#downloadReportTxt', el => el.addEventListener('click',()=>window.open(API.reportTxtUrl(),'_blank')));
  safe('#addPropertyForm', el => el.addEventListener('submit',handleAddProperty));
  safe('#propertyImageInput', el => el.addEventListener('change', async () => { if(el.files[0]){ pendingPropertyImage = await fileToDataUrl(el.files[0]); safe('#propertyImagePreview', img => img.src = pendingPropertyImage); } }));
  safe('#logoImageInput', el => el.addEventListener('change', async () => { if(el.files[0]){ pendingLogoImage = await fileToDataUrl(el.files[0]); initBranding(); toast('Logo dipilih. Klik Simpan Branding.'); } }));
  safe('#saveBranding', el => el.addEventListener('click',()=>{ localStorage.setItem('siteName', qs('#siteNameInput').value || 'UStayEase'); localStorage.setItem('logoText', qs('#logoTextInput').value || 'US'); if(pendingLogoImage) localStorage.setItem('siteLogoImage', pendingLogoImage); initBranding(); toast('Branding disimpan.'); }));
  safe('#resetBranding', el => el.addEventListener('click',()=>{ localStorage.removeItem('siteName'); localStorage.removeItem('logoText'); localStorage.removeItem('siteLogoImage'); pendingLogoImage=''; initBranding(); toast('Branding direset.'); }));
}

protectAdminPage(); initBranding(); renderSession(); bindEvents(); loadData();
