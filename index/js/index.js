/**
 * NIKAH PAKISTAN V2 - INDEX PAGE LOGIC
 * Handles tab switching, login, signup, forgot password,
 * and loads floating contact button.
 */

'use strict';

import { auth } from '../../firebase/firebase-config.js';
import {
    loginUser,
    signUpUser,
    resetPassword,
    checkEmailVerification,
    onAuthStateChange
} from '../../firebase/firebase-services.js';

// ----- DOM References -----
const tabButtons = document.querySelectorAll('.tab-btn');
const loginPanel = document.getElementById('login-panel');
const signupPanel = document.getElementById('signup-panel');
const forgotPanel = document.getElementById('forgot-panel');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const forgotForm = document.getElementById('forgot-form');

const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');
const forgotError = document.getElementById('forgot-error');
const forgotSuccess = document.getElementById('forgot-success');

// ----- Tab Switching Logic -----
function switchTab(tabName) {
    // Update active state on tab buttons
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Hide all panels first
    [loginPanel, signupPanel, forgotPanel].forEach(panel => {
        panel.style.display = 'none';
        panel.classList.remove('active');
    });

    // Show the requested panel
    if (tabName === 'login') {
        loginPanel.style.display = 'block';
        loginPanel.classList.add('active');
    } else if (tabName === 'signup') {
        signupPanel.style.display = 'block';
        signupPanel.classList.add('active');
    } else if (tabName === 'forgot') {
        forgotPanel.style.display = 'block';
        forgotPanel.classList.add('active');
    }
}

// Attach tab button listeners
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.dataset.tab === 'login' || btn.dataset.tab === 'signup') {
            switchTab(btn.dataset.tab);
        }
    });
});

// Link listeners for switching between login/signup/forgot
document.querySelector('.switch-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('login');
});

document.getElementById('show-forgot')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('forgot');
});

document.querySelector('.back-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('login');
});

// ----- Login Form Handler -----
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        loginError.textContent = 'Please fill in both email and password.';
        loginError.style.display = 'block';
        return;
    }

    const result = await loginUser(email, password);
    if (result.success) {
        // Redirect to browse (email verified check handled inside loginUser)
        window.location.href = '../dashboard/browse/browse.html';
    } else {
        loginError.textContent = result.error || 'Login failed. Please try again.';
        loginError.style.display = 'block';
        // If needs verification, we could add a resend link, but leave for now
    }
});

// ----- Signup Form Handler -----
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.style.display = 'none';

    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const gender = document.getElementById('signup-gender').value;
    const age = parseInt(document.getElementById('signup-age').value, 10);

    // Validation
    if (!name || !email || !password || !confirm || !gender || !age) {
        signupError.textContent = 'Please fill in all fields.';
        signupError.style.display = 'block';
        return;
    }
    if (password !== confirm) {
        signupError.textContent = 'Passwords do not match.';
        signupError.style.display = 'block';
        return;
    }
    if (password.length < 6) {
        signupError.textContent = 'Password must be at least 6 characters.';
        signupError.style.display = 'block';
        return;
    }
    if (age < 18) {
        signupError.textContent = 'You must be at least 18 years old.';
        signupError.style.display = 'block';
        return;
    }

    const result = await signUpUser(email, password, name, gender, age);
    if (result.success) {
        window.location.href = '../auth/verify/verify.html';
    } else {
        signupError.textContent = result.error || 'Signup failed. Please try again.';
        signupError.style.display = 'block';
    }
});

// ----- Forgot Password Handler -----
forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    forgotError.style.display = 'none';
    forgotSuccess.style.display = 'none';

    const email = document.getElementById('forgot-email').value.trim();
    if (!email) {
        forgotError.textContent = 'Please enter your email address.';
        forgotError.style.display = 'block';
        return;
    }

    const result = await resetPassword(email);
    if (result.success) {
        forgotSuccess.textContent = 'Password reset email sent. Please check your inbox.';
        forgotSuccess.style.display = 'block';
        document.getElementById('forgot-email').value = '';
    } else {
        forgotError.textContent = result.error || 'Failed to send reset email.';
        forgotError.style.display = 'block';
    }
});

// ----- Auth State Listener (Auto-redirect if logged in) -----
onAuthStateChange(async (user) => {
    if (user) {
        const verified = await checkEmailVerification();
        if (verified) {
            window.location.href = '../dashboard/browse/browse.html';
        } else {
            window.location.href = '../auth/verify/verify.html';
        }
    }
});

// ----- Load Floating Contact Button on Page Ready -----
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof loadComponent === 'function') {
        await loadComponent('../../components/floating-contact.html', document.body);
    }
});
