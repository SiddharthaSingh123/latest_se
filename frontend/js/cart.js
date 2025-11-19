// cart.js
// Reads cart from localStorage key 'h2h_cart' (format: {items:[{product_id, qty, snapshot}]})
// Renders UI and posts to /api/create-checkout-session to start Stripe Checkout.

(async function () {
  'use strict';

  const CART_KEY = 'h2h_cart';
  const API_CHECKOUT = '/api/create-checkout-session';

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || { items: [] };
    } catch (e) {
      return { items: [] };
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function formatCurrency(v) {
    if (v === null || v === undefined || v === '') return 'N/A';
    return '₹' + Number(v).toFixed(0);
  }

  function productImageSrc(p) {
    if (!p) return '/images/home.jpg';
    const raw = (p.image_url || p.dlink || p.img || p.image || '').trim();
    if (!raw) return '/images/home.jpg';
    if (/^https?:\/\//.test(raw)) return raw;
    if (raw.startsWith('/uploads/')) return '/static' + raw;
    if (raw.startsWith('uploads/')) return '/static/' + raw;
    if (raw.startsWith('/static/')) return raw;
    if (!raw.includes('/')) return '/static/uploads/' + raw;
    return '/static/' + raw.replace(/^\/+/, '');
  }

  function createRow(item, idx) {
    const p = item.snapshot || {};
    const qty = item.qty || 1;

    const row = document.createElement('div');
    row.className = 'row mb-3 align-items-center';

    row.innerHTML = `
      <div class="col-md-2">
        <img src="${productImageSrc(p)}" class="img-fluid" style="max-height:90px;" onerror="this.onerror=null;this.src='/images/home.jpg'">
      </div>
      <div class="col-md-4">
        <h5 class="mb-1">${p.title || 'Product'}</h5>
        <div class="text-muted small">${p.description || ''}</div>
      </div>
      <div class="col-md-2">
        <strong>${formatCurrency(p.price)}</strong>
      </div>
      <div class="col-md-2">
        <div class="input-group input-group-sm">
          <div class="input-group-prepend">
            <button class="btn btn-outline-secondary btn-decr" data-idx="${idx}">-</button>
          </div>
          <input type="text" class="form-control form-control-sm text-center qty-input" value="${qty}" data-idx="${idx}" style="width:60px;">
          <div class="input-group-append">
            <button class="btn btn-outline-secondary btn-incr" data-idx="${idx}">+</button>
          </div>
        </div>
      </div>
      <div class="col-md-2 text-right">
        <button class="btn btn-sm btn-danger btn-remove" data-idx="${idx}">Remove</button>
      </div>
    `;

    return row;
  }

  function renderCart() {
    const cart = loadCart();
    const items = cart.items || [];
    const container = document.getElementById('cartContainer');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartSummary = document.getElementById('cartSummary');
    container.innerHTML = '';

    if (!items.length) {
      cartEmpty.style.display = '';
      cartSummary.style.display = 'none';
      return;
    }
    cartEmpty.style.display = 'none';
    cartSummary.style.display = '';

    items.forEach((it, idx) => {
      const row = createRow(it, idx);
      container.appendChild(row);
    });

    updateTotal();
    attachHandlers();
  }

  function updateTotal() {
    const cart = loadCart();
    const items = cart.items || [];
    let total = 0;
    items.forEach(it => {
      const price = (it.snapshot && it.snapshot.price) ? Number(it.snapshot.price) : 0;
      total += price * (it.qty || 0);
    });
    document.getElementById('cartTotal').innerText = formatCurrency(total);
  }

  function attachHandlers() {
    // increment
    document.querySelectorAll('.btn-incr').forEach(btn => {
      btn.onclick = (e) => {
        const idx = Number(btn.dataset.idx);
        const cart = loadCart();
        cart.items[idx].qty = (cart.items[idx].qty || 0) + 1;
        saveCart(cart);
        renderCart();
      };
    });
    // decrement
    document.querySelectorAll('.btn-decr').forEach(btn => {
      btn.onclick = (e) => {
        const idx = Number(btn.dataset.idx);
        const cart = loadCart();
        cart.items[idx].qty = Math.max(1, (cart.items[idx].qty || 1) - 1);
        saveCart(cart);
        renderCart();
      };
    });
    // qty input
    document.querySelectorAll('.qty-input').forEach(input => {
      input.onchange = (e) => {
        const idx = Number(input.dataset.idx);
        const cart = loadCart();
        let v = parseInt(input.value || '1', 10);
        if (isNaN(v) || v < 1) v = 1;
        cart.items[idx].qty = v;
        saveCart(cart);
        renderCart();
      };
    });
    // remove
    document.querySelectorAll('.btn-remove').forEach(btn => {
      btn.onclick = (e) => {
        const idx = Number(btn.dataset.idx);
        const cart = loadCart();
        cart.items.splice(idx, 1);
        saveCart(cart);
        renderCart();
      };
    });
  }

  // Proceed to Checkout: send cart to backend to create checkout session
  async function checkout() {
    const cart = loadCart();
    if (!cart.items || !cart.items.length) {
      alert('Cart is empty');
      return;
    }

    // Build a simple payload of items with product_id and quantity
    const items = cart.items.map(it => ({ product_id: it.product_id, quantity: it.qty || 1 }));

    try {
      const res = await fetch(API_CHECKOUT, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data && data.error ? data.error : `Checkout failed: ${res.status}`;
        if (window.Swal) Swal.fire('Error', err, 'error');
        else alert(err);
        return;
      }
      // redirect to Stripe Checkout
      if (data && data.url) {
        window.location.href = data.url;
      } else {
        if (window.Swal) Swal.fire('Error', 'No checkout URL returned', 'error');
        else alert('No checkout URL returned');
      }
    } catch (err) {
      console.error(err);
      if (window.Swal) Swal.fire('Error', 'Network error', 'error');
      else alert('Network error');
    }
  }

  // Bind checkout button
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('checkoutBtn').addEventListener('click', checkout);
    renderCart();
  });

})();
