const API = {
  base: window.API_BASE_URL,
  async request(path, options = {}) {
    const url = `${this.base}${path}`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    if (!response.ok) {
      let message = 'A server error occurred';
      try { message = (await response.json()).error || message; } catch (_) {}
      throw new Error(message);
    }
    if (response.status === 204) return null;
    return response.json();
  },
  getSystemMaintenance() { return this.request('/system/maintenance'); },
  setSystemMaintenance(maintenance) { return this.request('/system/maintenance', { method: 'POST', body: JSON.stringify({ maintenance }) }); },
  register(payload) { return this.request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }); },
  login(payload) { return this.request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }); },
  getProperties() { return this.request('/properties'); },
  createProperty(payload) { return this.request('/properties', { method: 'POST', body: JSON.stringify(payload) }); },
  getBookings() { return this.request('/bookings'); },
  getPemesanans() { return this.getBookings(); },
  createBooking(payload) { return this.request('/bookings', { method: 'POST', body: JSON.stringify(payload) }); },
  updateMaintenance(id, status) { return this.request(`/properties/${id}/maintenance`, { method: 'PATCH', body: JSON.stringify({ status }) }); },
  getStats() { return this.request('/stats'); },
  reportUrl() { return `${this.base}/reports/bookings.csv`; },
  reportTxtUrl() { return `${this.base}/reports/bookings.txt`; },
  receiptTxtUrl(id) { return `${this.base}/receipts/${id}.txt`; }
};
