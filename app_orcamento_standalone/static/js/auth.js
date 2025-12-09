const AUTH_KEY = 'resolve_auth_token';
const USER_KEY = 'resolve_user_email';

function getAuthToken() {
    return localStorage.getItem(AUTH_KEY);
}

function setAuthToken(token, email) {
    localStorage.setItem(AUTH_KEY, token);
    if (email) localStorage.setItem(USER_KEY, email);
}

function logout() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/static/app.html#/login';
}

function requireAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/static/app.html#/login';
        return null;
    }
    return token;
}

function showStatus(message, type, elementId = 'status') {
    const el = document.getElementById(elementId);
    if (el) {
        el.style.display = 'block';
        el.className = type;
        el.innerText = message;
    } else {
        alert(message);
    }
}

// Check logged in state for UI
function checkLoginState() {
    const token = getAuthToken();
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const userDisplay = document.getElementById('user-display');

    if (token) {
        if (loginSection) loginSection.style.display = 'none';
        if (dashboardSection) dashboardSection.style.display = 'block';
        if (userDisplay) userDisplay.innerText = localStorage.getItem(USER_KEY) || 'Usuário';
    } else {
        if (loginSection) loginSection.style.display = 'block';
        if (dashboardSection) dashboardSection.style.display = 'none';
    }
}
