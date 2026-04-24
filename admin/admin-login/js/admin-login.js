/**
 * NIKAH PAKISTAN V2 - ADMIN LOGIN LOGIC
 * Authenticates admin via Firebase Auth,
 * checks admin privileges via UID list or Firestore admins collection.
 */

'use strict';

import { auth } from '../../firebase/firebase-config.js';
import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----- DOM Elements -----
const form = document.getElementById('admin-login-form');
const emailInput = document.getElementById('admin-email');
const passwordInput = document.getElementById('admin-password');
const errorDiv = document.getElementById('admin-login-error');
const loader = document.getElementById('admin-login-loader');
const submitBtn = form.querySelector('button[type="submit"]');

// ----- Admin UID List (Placeholder - replace with actual admin UID) -----
const ADMIN_UIDS = [
    'PLACEHOLDER_ADMIN_UID' // Replace this with your Firebase Auth UID
];

// ----- Helper: Check if a UID is admin -----
async function isAdmin(uid) {
    // 1. Check hardcoded list first
    if (ADMIN_UIDS.includes(uid)) return true;

    // 2. Fallback: check Firestore admins/{uid} document
    try {
        const db = window.db;
        if (!db) return false;
        const adminDocRef = doc(db, "admins", uid);
        const snap = await getDoc(adminDocRef);
        return snap.exists();
    } catch (error) {
        console.warn('Firestore admin check failed:', error);
        return false;
    }
}

// ----- Helper: Show Bilingual Error -----
function showError(english, urdu) {
    errorDiv.innerHTML = `<span>${english}</span> <span class="urdu">${urdu}</span>`;
    errorDiv.style.display = 'block';
}

function hideError() {
    errorDiv.style.display = 'none';
}

// ----- Loading State -----
function setLoading(loading) {
    submitBtn.disabled = loading;
    loader.style.display = loading ? 'block' : 'none';
}

// ----- Redirect to Dashboard -----
function goToDashboard() {
    window.location.href = '../admin-dashboard/admin-dashboard.html';
}

// ----- Check existing session on load -----
async function checkExistingSession() {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
        const allowed = await isAdmin(user.uid);
        if (allowed) {
            goToDashboard();
        } else {
            // Not admin – force sign out and show form
            await signOut(auth);
            showError('Access denied. You are not an admin.', 'رسائی مسترد کر دی گئی۔ آپ ایڈمن نہیں ہیں۔');
        }
    } catch (error) {
        console.error('Session check error:', error);
    } finally {
        setLoading(false);
    }
}

// ----- Form Submit Handler -----
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showError('Please enter email and password.', 'براہ کرم ای میل اور پاس ورڈ درج کریں۔');
        return;
    }

    setLoading(true);
    try {
        // Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check admin privileges
        const allowed = await isAdmin(user.uid);
        if (allowed) {
            goToDashboard();
        } else {
            // Not admin – sign out and show error
            await signOut(auth);
            showError('Access denied. You are not an admin.', 'رسائی مسترد کر دی گئی۔ آپ ایڈمن نہیں ہیں۔');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        // Map Firebase error codes to bilingual messages
        switch (error.code) {
            case 'auth/wrong-password':
                showError('Incorrect password.', 'پاس ورڈ غلط ہے۔');
                break;
            case 'auth/user-not-found':
                showError('Account not found.', 'اکاؤنٹ نہیں ملا۔');
                break;
            case 'auth/invalid-email':
                showError('Invalid email format.', 'ای میل کا فارمیٹ غلط ہے۔');
                break;
            case 'auth/too-many-requests':
                showError('Too many attempts. Try again later.', 'بہت زیادہ کوششیں۔ بعد میں دوبارہ کوشش کریں۔');
                break;
            default:
                showError('Login failed. Please try again.', 'لاگ ان ناکام۔ دوبارہ کوشش کریں۔');
        }
    } finally {
        setLoading(false);
    }
});

// ----- Initialise -----
checkExistingSession();
