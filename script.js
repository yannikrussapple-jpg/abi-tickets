(() => {
  const TOTAL = 200;
  const PRICE_PER_TICKET = 12;
  // n8n webhook configuration
  const N8N_WEBHOOK_URL = 'https://n8n.srv1146092.hstgr.cloud/webhook-test/c23e2274-650c-43e9-bfd7-fa524b922d97';
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

  const submitToWebhook = async (payload) => {
    if (!N8N_WEBHOOK_URL) throw new Error('n8n Webhook URL nicht konfiguriert.');
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Webhook fehlgeschlagen: ${res.status} ${res.statusText}`);
    return res.json().catch(() => ({}));
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
        const capture = await actions.order.capture();
        const code = makeCode();
        const dbRecord = {
          first_name: order.firstName,
          last_name: order.lastName,
          birthdate: order.birthdate,
          email: order.email,
          quantity: order.quantity,
          price_per_ticket: order.pricePerTicket,
          total: order.total,
          payment_provider: 'paypal',
          paypal_order_id: (capture && capture.id) || (data && data.orderID) || null,
          paypal_payer_id: (data && data.payerID) || null,
          ticket_code: code,
          created_at: new Date().toISOString()
        };
        try {
          await submitToWebhook(dbRecord);
        } catch (e) {
          alert('Speichern im n8n Webhook fehlgeschlagen: ' + (e.message || e));
          return;
        }

        remaining -= order.quantity;
        updateUI();

        confirmation.hidden = false;
        confirmationTitle.textContent = 'Zahlung bestätigt';
        confirmationDetail.textContent = `${order.quantity} Ticket(s) für ${order.firstName} ${order.lastName} · 12 € pro Ticket · Zahlung PayPal.`;
        ticketCodeEl.textContent = code;

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

      const payload = {
        firstName: pendingOrder.firstName,
        lastName: pendingOrder.lastName,
        birthdate: pendingOrder.birthdate,
        email: pendingOrder.email,
        quantity: pendingOrder.quantity,
        pricePerTicket: pendingOrder.pricePerTicket,
        total: pendingOrder.total,
        timestamp: pendingOrder.timestamp
      };

      try {
        await submitToWebhook(payload);
      } catch (e) {
        alert('Fehler beim Senden an n8n: ' + (e.message || e));
        return;
      }

      const code = makeCode();
      remaining -= pendingOrder.quantity;
      updateUI();

      confirmation.hidden = false;
      confirmationTitle.textContent = 'Zahlung bestätigt';
      confirmationDetail.textContent = `${pendingOrder.quantity} Ticket(s) für ${pendingOrder.firstName} ${pendingOrder.lastName} · 12 € pro Ticket · Zahlung PayPal.`;
      ticketCodeEl.textContent = code;

      pendingOrder = null;
      form.reset();
    });
  }

  updateUI();
})();
