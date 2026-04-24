/**
 * NIKAH PAKISTAN V2 - ADMIN SETTINGS LOGIC
 * Pre-fills global config, saves to Firestore, updates in-memory config.
 */

'use strict';

import { auth } from '../../firebase/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----- DOM Elements -----
const form = document.getElementById('admin-settings-form');
const logoutBtn = document.getElementById('logout-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('admin-sidebar');
const messageDiv = document.getElementById('settings-message');

const siteNameInput = document.getElementById('site-name');
const adminWhatsAppInput = document.getElementById('admin-whatsapp');
const supportEmailInput = document.getElementById('support-email');
const channelLinkInput = document.getElementById('channel-link');
const minMatchPercentInput = document.getElementById('min-match-percent');

const weightCitySlider = document.getElementById('weight-city');
const weightAgeSlider = document.getElementById('weight-age');
const weightMaslakSlider = document.getElementById('weight-maslak');
const weightEducationSlider = document.getElementById('weight-education');
const weightLanguageSlider = document.getElementById('weight-language');

const cityValueSpan = document.getElementById('city-value');
const ageValueSpan = document.getElementById('age-value');
const maslakValueSpan = document.getElementById('maslak-value');
const educationValueSpan = document.getElementById('education-value');
const languageValueSpan = document.getElementById('language-value');

// ----- Admin UIDs (Replace with actual) -----
const ADMIN_UIDS = ['PLACEHOLDER_ADMIN_UID'];

// ----- Helper: Check Admin Access -----
async function checkAdminAccess() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = '../admin-login/admin-login.html';
        return false;
    }
    if (!ADMIN_UIDS.includes(user.uid)) {
        // Optionally check Firestore admins/{uid}
        try {
            const db = window.db;
            if (db) {
                const adminDocRef = doc(db, "admins", user.uid);
                // getDoc not imported, so we rely on UID list only
            }
        } catch (e) {}
        await signOut(auth);
        window.location.href = '../admin-login/admin-login.html';
        return false;
    }
    return true;
}

// ----- Helper: Show Bilingual Message -----
function showMessage(english, urdu, isError = false) {
    messageDiv.style.display = 'block';
    messageDiv.innerHTML = `<span>${english}</span> <span class="urdu">${urdu}</span>`;
    messageDiv.className = isError ? 'form-message error' : 'form-message success';
}

function hideMessage() {
    messageDiv.style.display = 'none';
}

// ----- Pre-fill form from global config -----
function prefillForm() {
    const config = window.NIKAH_CONFIG || {};
    siteNameInput.value = config.siteName || 'Nikah Pakistan';
    adminWhatsAppInput.value = config.adminWhatsApp || '923439850348';
    supportEmailInput.value = config.supportEmail || 'help@nikahpakistan.com';
    channelLinkInput.value = config.whatsappChannelLink || '';
    minMatchPercentInput.value = config.minMatchPercentage || 60;

    // Weights (use matchingWeights if stored, else defaults)
    const weights = config.matchingWeights || {
        city: 35,
        age: 25,
        maslak: 20,
        education: 15,
        language: 5
    };
    weightCitySlider.value = weights.city;
    weightAgeSlider.value = weights.age;
    weightMaslakSlider.value = weights.maslak;
    weightEducationSlider.value = weights.education;
    weightLanguageSlider.value = weights.language;
    updateSliderValues();
}

// ----- Update displayed slider values -----
function updateSliderValues() {
    cityValueSpan.textContent = weightCitySlider.value;
    ageValueSpan.textContent = weightAgeSlider.value;
    maslakValueSpan.textContent = weightMaslakSlider.value;
    educationValueSpan.textContent = weightEducationSlider.value;
    languageValueSpan.textContent = weightLanguageSlider.value;
}

// ----- Attach slider update events -----
[weightCitySlider, weightAgeSlider, weightMaslakSlider, weightEducationSlider, weightLanguageSlider].forEach(slider => {
    slider.addEventListener('input', updateSliderValues);
});

// ----- Save Settings -----
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    // Gather values
    const siteName = siteNameInput.value.trim();
    const adminWhatsapp = adminWhatsAppInput.value.trim();
    const supportEmail = supportEmailInput.value.trim();
    const channelLink = channelLinkInput.value.trim();
    const minMatch = parseInt(minMatchPercentInput.value) || 60;

    const cityW = parseInt(weightCitySlider.value);
    const ageW = parseInt(weightAgeSlider.value);
    const maslakW = parseInt(weightMaslakSlider.value);
    const educationW = parseInt(weightEducationSlider.value);
    const languageW = parseInt(weightLanguageSlider.value);

    // Update in-memory global config
    const config = window.NIKAH_CONFIG;
    if (!config) return;
    config.siteName = siteName;
    config.adminWhatsApp = adminWhatsapp;
    config.adminContactRaw = adminWhatsapp; // keep in sync
    config.supportEmail = supportEmail;
    config.whatsappChannelLink = channelLink;
    config.minMatchPercentage = minMatch;
    config.matchingWeights = {
        city: cityW,
        age: ageW,
        maslak: maslakW,
        education: educationW,
        language: languageW
    };

    // Save to Firestore config/site document
    try {
        const db = window.db;
        if (db) {
            const configDocRef = doc(db, "config", "site");
            await setDoc(configDocRef, {
                siteName,
                adminWhatsApp: adminWhatsapp,
                supportEmail,
                whatsappChannelLink: channelLink,
                minMatchPercentage: minMatch,
                matchingWeights: {
                    city: cityW,
                    age: ageW,
                    maslak: maslakW,
                    education: educationW,
                    language: languageW
                },
                updatedAt: serverTimestamp()
            }, { merge: true });
        }
        showMessage('Settings saved successfully!', 'ترتیبات کامیابی سے محفوظ ہو گئیں!', false);
    } catch (error) {
        console.error('Save settings error:', error);
        showMessage('Failed to save settings.', 'ترتیبات محفوظ نہیں ہو سکیں۔', true);
    }
});

// ----- Logout -----
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../admin-login/admin-login.html';
});

// ----- Sidebar Toggle (Mobile) -----
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// ----- Initialize -----
(async function init() {
    const access = await checkAdminAccess();
    if (!access) return;
    prefillForm();
})();
