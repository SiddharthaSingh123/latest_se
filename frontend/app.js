// frontend/app.js

// 🔹 Backend base URL on Render
const API = "/api";

// Helper: show messages if an element exists
function showMsg(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = typeof text === 'string' ? text : JSON.stringify(text);
}

// ----------------- Registration -----------------
const regBtn = document.getElementById('btnRegister');
const regForm = document.getElementById('registerForm');

async function registerUser(username, email, password) {
  const res = await fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, email, password })
  });
  return res.json();
}

async function handleRegisterAndRedirect(username, email, password) {
  const data = await registerUser(username, email, password);
  return data;
}

if (regBtn) {
  regBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('Register button clicked');
    const username = (document.getElementById('reg_username') || {}).value || '';
    const email = (document.getElementById('reg_email') || {}).value || '';
    const password = (document.getElementById('reg_password') || {}).value || '';
    showMsg('reg_msg', 'Processing...');
    try {
      const data = await handleRegisterAndRedirect(username, email, password);
      console.log('Register response:', data);
      showMsg('reg_msg', data.message || data.error || JSON.stringify(data));
      if (data && data.message && data.message.toLowerCase().includes('registered')) {
        // after successful registration, redirect to home where cookie exists
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Register error', err);
      showMsg('reg_msg', 'Network error');
    }
  });
}

if (regForm) {
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Register form submitted');
    const username = (document.getElementById('reg_username') || {}).value || '';
    const email = (document.getElementById('reg_email') || {}).value || '';
    const password = (document.getElementById('reg_password') || {}).value || '';
    showMsg('reg_msg', 'Processing...');
    try {
      const data = await handleRegisterAndRedirect(username, email, password);
      console.log('Register response:', data);
      showMsg('reg_msg', data.message || data.error || JSON.stringify(data));
      if (data && data.message && data.message.toLowerCase().includes('registered')) {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Register error', err);
      showMsg('reg_msg', 'Network error');
    }
  });
}

// ----------------- Login -----------------
async function loginUser(email, password, remember) {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, remember })
  });
  return res.json();
}

const loginBtn = document.getElementById('btnLogin');
const loginForm = document.getElementById('loginForm');

async function handleLoginAndRedirect(email, password, remember) {
  const data = await loginUser(email, password, remember);
  return data;
}

if (loginBtn) {
  loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('Login button clicked');
    const email = (document.getElementById('login_email') || {}).value || '';
    const password = (document.getElementById('login_password') || {}).value || '';
    const remember = !!(document.getElementById('remember_me') && document.getElementById('remember_me').checked);
    showMsg('login_msg', 'Processing...');
    try {
      const data = await handleLoginAndRedirect(email, password, remember);
      console.log('Login response:', data);
      showMsg('login_msg', data.message || data.error || JSON.stringify(data));
      if (data && data.message && data.message.toLowerCase().includes('logged in')) {
        // Successful login — redirect to home where session cookie will be active
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Login error', err);
      showMsg('login_msg', 'Network error');
    }
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Login form submitted');
    const email = (document.getElementById('login_email') || {}).value || '';
    const password = (document.getElementById('login_password') || {}).value || '';
    const remember = !!(document.getElementById('remember_me') && document.getElementById('remember_me').checked);
    showMsg('login_msg', 'Processing...');
    try {
      const data = await handleLoginAndRedirect(email, password, remember);
      console.log('Login response:', data);
      showMsg('login_msg', data.message || data.error || JSON.stringify(data));
      if (data && data.message && data.message.toLowerCase().includes('logged in')) {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Login error', err);
      showMsg('login_msg', 'Network error');
    }
  });
}

// ----------------- Logout -----------------
async function logoutUser() {
  await fetch(`${API}/logout`, {
    method: 'POST',
    credentials: 'include'
  });
}

// also support old onclick="logout(event)" in your HTML
window.logout = async function (e) {
  if (e && e.preventDefault) e.preventDefault();
  try {
    await logoutUser();
  } catch (err) {
    console.error('Logout error', err);
  }
  window.location.reload();
};

// ----------------- Current user / session -----------------
async function fetchCurrentUser() {
  const res = await fetch(`${API}/user`, {
    method: 'GET',
    credentials: 'include'
  });
  return res.json();
}

/**
 * updateNavForUser - show/hide nav links based on authentication state
 * @param {object} data - response from GET /api/user
 */
function updateNavForUser(data) {
  const navLogin = document.getElementById('navLogin');
  const navSignup = document.getElementById('navSignup');
  const navUser = document.getElementById('navUser');
  const navUsername = document.getElementById('navUsername');
  const navLogout = document.getElementById('navLogout');

  if (data && data.authenticated) {
    if (navLogin) navLogin.style.display = 'none';
    if (navSignup) navSignup.style.display = 'none';
    if (navUser) navUser.style.display = 'block';
    if (navUsername) navUsername.innerText = data.user && data.user.username ? data.user.username : 'User';

    if (navLogout) {
      const newNavLogout = navLogout.cloneNode(true);
      navLogout.parentNode.replaceChild(newNavLogout, navLogout);
      newNavLogout.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await logoutUser();
        } catch (err) {
          console.error('Logout error', err);
        }
        await refreshUser();
        // After logout, refresh current page to reflect logged-out UI
        window.location.reload();
      });
    }
  } else {
    if (navLogin) navLogin.style.display = 'block';
    if (navSignup) navSignup.style.display = 'block';
    if (navUser) navUser.style.display = 'none';
  }
}

/**
 * updateHeroForUser - hide the hero (big) login/signup and update hero UI for logged-in user
 */
function updateHeroForUser(data) {
  const heroLoginBtn = document.getElementById('heroLoginBtn');   // big login button in hero
  const heroSignupBtn = document.getElementById('heroSignupBtn'); // big signup text/link in hero
  const heroWelcome = document.getElementById('heroWelcome');     // optional area to show welcome message

  if (data && data.authenticated) {
    if (heroLoginBtn) heroLoginBtn.style.display = 'none';
    if (heroSignupBtn) heroSignupBtn.style.display = 'none';
    if (heroWelcome) {
      heroWelcome.innerText = `Welcome back, ${data.user.username}!`;
      heroWelcome.style.display = 'block';
    }
  } else {
    if (heroLoginBtn) heroLoginBtn.style.display = '';
    if (heroSignupBtn) heroSignupBtn.style.display = '';
    if (heroWelcome) heroWelcome.style.display = 'none';
  }
}

async function refreshUser() {
  try {
    const data = await fetchCurrentUser();
    console.log('Current user:', data);
    updateNavForUser(data);
    updateHeroForUser(data);

    // also fallback username display
    if (data.authenticated) {
      const usernameEl = document.getElementById('usernameDisplay');
      if (usernameEl) usernameEl.innerText = data.user.username;
    }
  } catch (err) {
    console.error('Error fetching current user', err);
    updateNavForUser({ authenticated: false });
    updateHeroForUser({ authenticated: false });
  }
}

// ----------------- Product: create, list, my-products -----------------

// Submit a new product (call from product form)
async function submitProduct(title, description, price, image_url) {
  const res = await fetch(`${API}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ title, description, price, image_url })
  });
  return res.json();
}

// Hook up product add button if present
const addBtn = document.getElementById('btnAddProduct');
if (addBtn) {
  addBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('Add product clicked');
    const title = (document.getElementById('prod_title') || {}).value || '';
    const desc = (document.getElementById('prod_desc') || {}).value || '';
    const price = (document.getElementById('prod_price') || {}).value || '';
    const image_url = (document.getElementById('prod_image_url') || {}).value || '';
    // Basic validation
    if (!title) {
      alert('Title is required');
      return;
    }
    try {
      const result = await submitProduct(title, desc, price, image_url);
      console.log('Product create:', result);
      if (result && result.message) {
        // Redirect to buy-products page where list will be fetched
        window.location.href = '/buy-products.html';
      } else {
        alert(result.error || 'Could not create product');
      }
    } catch (err) {
      console.error('Error creating product', err);
      alert('Network error creating product');
    }
  });
}

// Fetch and render all products (Buy Products page)
async function fetchAllProducts() {
  try {
    const res = await fetch(`${API}/products`, { credentials: 'include' });
    const products = await res.json();
    renderProductsList(products);
  } catch (err) {
    console.error('fetchAllProducts error', err);
  }
}

function renderProductsList(products) {
  const container = document.getElementById('productsList');
  if (!container) return;
  container.innerHTML = ''; // clear

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-image" style="max-width:300px;">
        <img src="${p.image_url || 'images/default-product.png'}" alt="${escapeHtml(p.title)}" style="width:100%; height:auto;" />
      </div>
      <div class="product-info">
        <h4>${escapeHtml(p.title)}</h4>
        <p>${escapeHtml(p.description || '')}</p>
        <p><strong>Price:</strong> ${p.price != null ? '₹' + p.price : 'Not specified'}</p>
        <p><small>Seller ID: ${escapeHtml(String(p.owner_id))}</small></p>
      </div>
    `;
    container.appendChild(card);
  });
}

// Fetch current user's products (Profile -> My Products)
async function fetchMyProducts() {
  try {
    const res = await fetch(`${API}/my-products`, { credentials: 'include' });
    const prods = await res.json();
    renderMyProducts(prods);
  } catch (err) {
    console.error('fetchMyProducts error', err);
  }
}

function renderMyProducts(products) {
  const container = document.getElementById('myProductsList');
  if (!container) return;
  container.innerHTML = '';
  products.forEach(p => {
    const row = document.createElement('div');
    row.className = 'my-product-row';
    row.style.display = 'flex';
    row.style.gap = '12px';
    row.style.marginBottom = '12px';
    row.innerHTML = `
      <div class="thumb" style="max-width:120px;">
        <img src="${p.image_url || 'images/default-product.png'}" alt="${escapeHtml(p.title)}" style="width:100%; height:auto;" />
      </div>
      <div class="meta">
        <h5>${escapeHtml(p.title)}</h5>
        <p>${escapeHtml(p.description || '')}</p>
        <p><strong>Price:</strong> ${p.price != null ? '₹' + p.price : 'Not specified'}</p>
      </div>
    `;
    container.appendChild(row);
  });
}

// very small safe escape
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// Load products on pages where containers exist
if (document.getElementById('productsList')) {
  window.addEventListener('DOMContentLoaded', fetchAllProducts);
}
if (document.getElementById('myProductsList')) {
  window.addEventListener('DOMContentLoaded', fetchMyProducts);
}

// ----------------- Logout button (if present elsewhere) -----------------
const logoutBtn = document.getElementById('btnLogout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('Logout clicked');
    await logoutUser();
    await refreshUser();
    window.location.reload();
  });
}

// Call refreshUser on DOMContentLoaded so navbar updates immediately
window.addEventListener('DOMContentLoaded', refreshUser);
