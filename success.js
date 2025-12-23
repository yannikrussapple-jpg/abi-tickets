(() => {
  const fmtEUR = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '–';
    return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  };

  const getEl = (id) => document.getElementById(id);

  const statusEl = getEl('success-status');
  const qtyEl = getEl('success-quantity');
  const totalEl = getEl('success-total');
  const nameEl = getEl('success-name');
  const emailEl = getEl('success-email');
  const codeEl = getEl('success-code');
  const noteEl = getEl('success-note');

  const boxEl = getEl('success-box');
  const missingEl = getEl('success-missing');

  let data = null;
  try {
    data = JSON.parse(sessionStorage.getItem('lastPurchase') || 'null');
  } catch {
    data = null;
  }

  if (!data || !data.ticketCode || !data.email) {
    if (missingEl) missingEl.hidden = false;
    if (boxEl) boxEl.hidden = true;
    if (statusEl) statusEl.textContent = '—';
    return;
  }

  if (boxEl) boxEl.hidden = false;
  if (missingEl) missingEl.hidden = true;

  if (statusEl) statusEl.textContent = 'Bestätigt';
  if (qtyEl) qtyEl.textContent = `${data.quantity} Ticket(s)`;
  if (totalEl) totalEl.textContent = fmtEUR(data.total);
  if (nameEl) nameEl.textContent = data.name || '–';
  if (emailEl) emailEl.textContent = data.email;
  if (codeEl) codeEl.textContent = data.ticketCode;

  if (noteEl) {
    noteEl.textContent = 'Speichere dir den Ticket-Code für die Abholung.';
  }

  // optional: clear it so refresh doesn't reuse old data
  // sessionStorage.removeItem('lastPurchase');
})();
