/**
 * NIKAH PAKISTAN V2 - VERIFY PAGE LOGIC
 * Handles email verification status check,
 * resending verification emails, and auto-redirect.
 */

'use strict';

import { auth } from '../../firebase/firebase-config.js';
import {
    checkEmailVerification,
    sendVerificationEmail
} from '../../firebase/firebase-services.js';

// ----- DOM Elements -----
const statusMessage = document.getElementById('status-message');
const loadingSpinner = document.getElementById('loading-spinner');
const checkStatusBtn = document.getElementById('check-status-btn');
const resendEmailBtn = document.getElementById('resend-email-btn');

// ----- Helpers -----
function showStatus(englishText, urduText, isError = false) {
    statusMessage.innerHTML = `
        <span>${englishText}</span>
        <span class="urdu">${urduText}</span>
    `;
    statusMessage.style.display = 'block';
    statusMessage.className = isError ? 'form-message error' : 'form-message success';
}

function hideStatus() {
    statusMessage.style.display = 'none';
}

function setButtonsDisabled(disable) {
    checkStatusBtn.disabled = disable;
    resendEmailBtn.disabled = disable;
}

function showLoading(show) {
    loadingSpinner.style.display = show ? 'block' : 'none';
}

// ----- Auto-Check on Page Load -----
async function initialCheck() {
    const user = auth.currentUser;
    if (!user) {
        // Not logged in – redirect to login
        window.location.href = '../login/login.html';
        return;
    }
    // Check if already verified
    try {
        const verified = await checkEmailVerification();
        if (verified) {
            window.location.href = '../../dashboard/browse/browse.html';
        }
    } catch (error) {
        console.error('Initial verify check error:', error);
        // Stay on page, user can manually check
    }
}

// ----- Check Status Button -----
checkStatusBtn.addEventListener('click', async () => {
    hideStatus();
    setButtonsDisabled(true);
    showLoading(true);
    try {
        const verified = await checkEmailVerification();
        if (verified) {
            window.location.href = '../../dashboard/browse/browse.html';
        } else {
            showStatus(
                'Your email is not verified yet. Please check your inbox or resend the email.',
                'آپ کی ای میل ابھی تک تصدیق شدہ نہیں ہے۔ براہ کرم اپنا ان باکس چیک کریں یا ای میل دوبارہ بھیجیں۔',
                true
            );
        }
    } catch (error) {
        showStatus(
            'Could not verify status. Please try again.',
            'تصدیق کی صورتحال چیک نہیں ہو سکی۔ دوبارہ کوشش کریں۔',
            true
        );
    } finally {
        setButtonsDisabled(false);
        showLoading(false);
    }
});

// ----- Resend Email Button -----
resendEmailBtn.addEventListener('click', async () => {
    hideStatus();
    setButtonsDisabled(true);
    showLoading(true);
    try {
        const user = auth.currentUser;
        if (!user) {
            showStatus(
                'You are not logged in. Redirecting...',
                'آپ لاگ ان نہیں ہیں۔ ری ڈائریکٹ کیا جا رہا ہے...',
                true
            );
            setTimeout(() => { window.location.href = '../login/login.html'; }, 1500);
            return;
        }
        const result = await sendVerificationEmail(user);
        if (result.success) {
            showStatus(
                'Verification email sent! Please check your inbox.',
                'تصدیق کی ای میل بھیج دی گئی ہے! براہ کرم اپنا ان باکس چیک کریں۔',
                false
            );
        } else {
            showStatus(
                'Failed to send email. Please try again.',
                'ای میل بھیجنے میں ناکامی۔ براہ کرم دوبارہ کوشش کریں۔',
                true
            );
        }
    } catch (error) {
        showStatus(
            'An error occurred. Please try again.',
            'ایک خرابی پیش آگئی۔ دوبارہ کوشش کریں۔',
            true
        );
    } finally {
        setButtonsDisabled(false);
        showLoading(false);
    }
});

// ----- Load Floating Contact Button -----
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof loadComponent === 'function') {
        await loadComponent('../../components/floating-contact.html', document.body);
    }
});

// ----- Kick off initial check -----
initialCheck();
