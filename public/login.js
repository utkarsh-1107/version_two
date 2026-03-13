const loginFormEl = document.getElementById("login-form");
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const loginErrorEl = document.getElementById("login-error");
const loginSubmitBtn = document.getElementById("login-submit-btn");

function setError(text = "") {
  if (!loginErrorEl) return;
  loginErrorEl.textContent = text;
}

async function apiFetch(url, options = {}) {
  const requestOptions = { credentials: "same-origin", ...(options || {}) };
  return fetch(url, requestOptions);
}

async function bootstrap() {
  try {
    const response = await apiFetch("/auth/me", { cache: "no-store" });
    if (response.ok) {
      window.location.replace("/");
      return;
    }
  } catch (_error) {
    // stay on login page
  }
}

async function submitLogin(event) {
  event.preventDefault();
  const username = String(usernameEl?.value || "").trim();
  const password = String(passwordEl?.value || "").trim();
  if (!username || !password) {
    setError("Enter username and password.");
    return;
  }

  if (loginSubmitBtn) loginSubmitBtn.disabled = true;
  setError("");
  try {
    const response = await apiFetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Login failed.");
    }
    window.location.replace("/");
  } catch (error) {
    setError(error.message || "Login failed.");
  } finally {
    if (loginSubmitBtn) loginSubmitBtn.disabled = false;
  }
}

if (loginFormEl) {
  loginFormEl.addEventListener("submit", submitLogin);
}
bootstrap();
