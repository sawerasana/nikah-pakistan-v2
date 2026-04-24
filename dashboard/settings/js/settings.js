/**
 * NIKAH PAKISTAN V2 - SETTINGS PAGE LOGIC
 * Change password, request account deletion, logout.
 */

'use strict';

import { auth } from '../../firebase/firebase-config.js';
import {
    signInWithEmailAndPassword,
    updatePassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ----- DOM Elements -----
const changePasswordForm = document.getElementById('change-password-form');
const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const confirmNewPasswordInput = document.getElementById('confirm-new-password');
const passwordMessage = document.getElementById('password-message');

const deleteAccountBtn = document.getElementById('delete-account-btn');
const logoutAllBtn = document.getElementById('logout-all-btn');

// ----- Helper: Show Bilingual Message -----
function showMessage(english, urdu, isError = false) {
    passwordMessage.style.display = 'block';
    passwordMessage.innerHTML = `<span>${english}</span> <span class="urdu">${urdu}</span>`;
    passwordMessage.className = isError ? 'form-message error' : 'form-message success';
}

function hideMessage() {
    passwordMessage.style.display = 'none';
}

// ----- Change Password Handler -----
changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmNewPasswordInput.value;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage('Please fill all password fields.', 'براہ کرم تمام پاس ورڈ فیلڈز پُر کریں۔', true);
        return;
    }
    if (newPassword.length < 6) {
        showMessage('New password must be at least 6 characters.', 'نیا پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔', true);
        return;
    }
    if (newPassword !== confirmPassword) {
        showMessage('New passwords do not match.', 'نئے پاس ورڈ ایک جیسے نہیں ہیں۔', true);
        return;
    }

    // Disable form button? We'll just show loading state via button
    const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Updating...</span> <span class="urdu">اپ ڈیٹ ہو رہا ہے...</span>';

    try {
        const user = auth.currentUser;
        if (!user || !user.email) {
            throw new Error('No user logged in');
        }

        // Re-authenticate with current password
        await signInWithEmailAndPassword(auth, user.email, currentPassword);
        // Update password
        await updatePassword(user, newPassword);

        showMessage('Password updated successfully!', 'پاس ورڈ کامیابی سے اپ ڈیٹ ہو گیا!', false);
        // Clear fields
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
    } catch (error) {
        console.error('Password change error:', error);
        if (error.code === 'auth/wrong-password') {
            showMessage('Current password is incorrect.', 'موجودہ پاس ورڈ غلط ہے۔', true);
        } else if (error.code === 'auth/requires-recent-login') {
            showMessage('Please log out and log back in to change your password.', 'پاس ورڈ تبدیل کرنے کے لیے دوبارہ لاگ ان کریں۔', true);
        } else {
            showMessage('Failed to update password. Please try again.', 'پاس ورڈ اپ ڈیٹ نہیں ہو سکا۔ دوبارہ کوشش کریں۔', true);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// ----- Delete Account (WhatsApp Admin) -----
deleteAccountBtn.addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) return;
    const uid = user.uid;
    const userName = user.displayName || 'User';
    const message = `Assalam-o-Alaikum, I want to delete my account. My UID: ${uid}, Name: ${userName}. Please process this request.`;
    const waNumber = window.NIKAH_CONFIG?.adminWhatsApp || '923121234567'; // fallback
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
});

// ----- Logout All Devices (actually logs out current device only, due to Firebase client limitation) -----
logoutAllBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = '../../auth/login/login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// ----- Load Floating Contact Button -----
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof loadComponent === 'function') {
        await loadComponent('../../components/floating-contact.html', document.body);
    }
});
