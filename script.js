(() => {
  const TOTAL = 200;
  const PRICE_PER_TICKET = 12;
  // Replace with your Google Apps Script / webhook URL that writes to the Sheet
  const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxtnAp53ivRoQJw2d0zXI8QuewiXSsHr7E8ia_ZOsX5EJzzgtOszzv1di4r4io-P-Hp/exec';
  let remaining = TOTAL;
  let pendingOrder = null;
  let paypalButtons = null;

  const heroBtn = document.querySelector('[data-scroll="tickets"]');
  const form = document.getElementById('ticket-form');
  const remainingEls = [
    document.getElementById('remaining-count'),
    document.getElementById('remaining-inline')
  ];
  const progressBar = document.getElementById('progress-bar');
  const confirmation = document.getElementById('confirmation');
  const confirmationTitle = document.getElementById('confirmation-title');
  const confirmationDetail = document.getElementById('confirmation-detail');
  const ticketCodeEl = document.getElementById('ticket-code');

  const updateUI = () => {
    remainingEls.forEach(el => {
      if (el) el.textContent = remaining;
    });
    const sold = TOTAL - remaining;
    const pct = Math.min(100, Math.round((sold / TOTAL) * 100));
    if (progressBar) progressBar.style.width = `${pct}%`;
  };

  const scrollToTickets = () => {
    const section = document.getElementById('tickets');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  };

  const makeCode = () => `ABI-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  if (heroBtn) heroBtn.addEventListener('click', scrollToTickets);

  const submitToSheet = async (payload) => {
    if (!SHEET_ENDPOINT || SHEET_ENDPOINT.includes('YOUR_ENDPOINT_ID')) {
      throw new Error('Bitte zuerst SHEET_ENDPOINT konfigurieren.');
    }

    const res = await fetch(SHEET_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Sheet nicht erreichbar.');
    const data = await res.json().catch(() => ({}));
    if (data && data.status && data.status !== 'ok') {
      throw new Error(data.message || 'Fehler beim Speichern.');
    }
    return data;
  };

  const clearPayPal = () => {
    if (paypalButtons) {
      paypalButtons.close();
      paypalButtons = null;
    }
    const container = document.getElementById('paypal-container');
    if (container) container.innerHTML = '';
  };

  const renderPayPal = (order) => {
    const container = document.getElementById('paypal-container');
    if (!container) return;
    clearPayPal();

    const amount = (order.quantity * PRICE_PER_TICKET).toFixed(2);
    if (!window.paypal) {
      alert('PayPal SDK nicht geladen.');
      return;
    }

    paypalButtons = window.paypal.Buttons({
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [{
            amount: {
              currency_code: 'EUR',
              value: amount
            },
            description: `Abi Party Tickets (${order.quantity}x)`
          }]
        });
      },
      onApprove: async (data, actions) => {
        await actions.order.capture();
        await submitToSheet(order);

        remaining -= order.quantity;
        updateUI();

        confirmation.hidden = false;
        confirmationTitle.textContent = 'Zahlung bestätigt';
        confirmationDetail.textContent = `${order.quantity} Ticket(s) für ${order.firstName} ${order.lastName} · 12 € pro Ticket · Zahlung PayPal.`;
        ticketCodeEl.textContent = makeCode();

        clearPayPal();
        pendingOrder = null;
        form.reset();
      },
      onError: (err) => {
        alert('PayPal Fehler: ' + err.message);
      },
      onCancel: () => {
        // optional: handle cancel
      }
    });

    paypalButtons.render(container);
  };

  if (form) {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const data = new FormData(form);
      const firstName = (data.get('firstName') || '').toString().trim();
      const lastName = (data.get('lastName') || '').toString().trim();
      const birthdate = (data.get('birthdate') || '').toString();
      const email = (data.get('email') || '').toString().trim();
      const quantity = Number(data.get('quantity'));

      if (!firstName || !lastName || !birthdate || !email) {
        alert('Bitte alle Felder ausfüllen (Vorname, Nachname, Geburtstag, E-Mail).');
        return;
      }

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        alert('Bitte eine Anzahl zwischen 1 und 10 wählen.');
        return;
      }

      if (quantity > remaining) {
        alert('Nicht genug Tickets verfügbar.');
        return;
      }
      pendingOrder = {
        firstName,
        lastName,
        birthdate,
        email,
        quantity,
        pricePerTicket: PRICE_PER_TICKET,
        total: PRICE_PER_TICKET * quantity,
        timestamp: new Date().toISOString()
      };

      renderPayPal(pendingOrder);
    });
  }

  updateUI();
})();
