/**
 * NIKAH PAKISTAN V2 - PROFILE COMPLETION LOGIC
 * Fetches user data, pre-fills form, updates progress,
 * saves all fields, uploads photo, and supports skip.
 */

'use strict';

import { auth } from '../../firebase/firebase-config.js';
import {
    getUserData,
    updateUserProfile,
    uploadProfilePhoto
} from '../../firebase/firebase-services.js';

// ----- DOM Elements -----
const profileForm = document.getElementById('profile-form');
const progressFill = document.getElementById('progress-fill');
const progressPercent = document.getElementById('progress-percent');
const progressPercentUrdu = document.getElementById('progress-percent-urdu');
const formMessage = document.getElementById('form-message');
const formLoader = document.getElementById('form-loader');
const skipBtn = document.getElementById('skip-btn');
const photoInput = document.getElementById('profile-photo-input');
const previewImg = document.getElementById('preview-img');
const photoPlaceholder = document.getElementById('photo-placeholder');
const maritalStatusSelect = document.getElementById('maritalStatus');
const prevMarriageGroup = document.getElementById('prev-marriage-group');

// ----- State -----
let selectedFile = null;
let uid = null;

// ----- Key Fields for Progress (excluding photo) -----
const KEY_FIELDS = [
    'city', 'education', 'profession', 'maritalStatus', 'height',
    'motherTongue', 'houseStatus', 'monthlyIncome', 'contactNumber',
    'demands', 'preferredCities', 'religiousEducation'
];

// ----- Helper: Show Bilingual Message -----
function showMessage(english, urdu, isError = false) {
    formMessage.style.display = 'block';
    formMessage.innerHTML = `<span>${english}</span> <span class="urdu">${urdu}</span>`;
    formMessage.className = isError ? 'form-message error' : 'form-message success';
}

function hideMessage() {
    formMessage.style.display = 'none';
}

// ----- Helper: Set Loading State -----
function setLoading(loading) {
    const submitBtn = profileForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = loading;
    formLoader.style.display = loading ? 'block' : 'none';
}

// ----- Progress Calculation -----
function updateProgressFromData(data) {
    const filledCount = KEY_FIELDS.filter(key => data[key] && data[key] !== '').length;
    const percent = Math.min(100, 10 + Math.round((filledCount / KEY_FIELDS.length) * 90));
    progressFill.style.width = percent + '%';
    progressPercent.textContent = percent + '%';
    progressPercentUrdu.textContent = percent + '٪';
}

// ----- Collect Form Data -----
function collectFormData() {
    return {
        city: document.getElementById('city').value.trim(),
        height: document.getElementById('height').value.trim(),
        complexion: document.getElementById('complexion').value,
        caste: document.getElementById('caste').value.trim(),
        tehsil: document.getElementById('tehsil').value.trim(),
        district: document.getElementById('district').value.trim(),
        maslak: document.getElementById('maslak').value,
        education: document.getElementById('education').value.trim(),
        religiousEducation: document.getElementById('religiousEducation').value.trim(),
        profession: document.getElementById('profession').value.trim(),
        maritalStatus: document.getElementById('maritalStatus').value,
        previousMarriageDetails: document.getElementById('previousMarriageDetails').value.trim(),
        childrenCount: parseInt(document.getElementById('childrenCount').value) || 0,
        motherTongue: document.getElementById('motherTongue').value.trim(),
        siblingsCount: parseInt(document.getElementById('siblingsCount').value) || 0,
        marriedSiblingsCount: parseInt(document.getElementById('marriedSiblingsCount').value) || 0,
        houseStatus: document.getElementById('houseStatus').value,
        parentsAlive: document.getElementById('parentsAlive').value,
        monthlyIncome: document.getElementById('monthlyIncome').value.trim(),
        marriageTimeline: document.getElementById('marriageTimeline').value.trim(),
        demands: document.getElementById('demands').value.trim(),
        preferredCities: document.getElementById('preferredCities').value.trim(),
        contactNumber: document.getElementById('contactNumber').value.trim(),
        hobbies: document.getElementById('hobbies').value.trim(),
        jahezOrHaqMehr: document.getElementById('jahezOrHaqMehr').value.trim()
    };
}

// ----- Pre-fill Form with Existing Data -----
function prefillForm(data) {
    if (!data) return;
    const fields = [
        'city', 'height', 'complexion', 'caste', 'tehsil', 'district',
        'maslak', 'education', 'religiousEducation', 'profession',
        'maritalStatus', 'previousMarriageDetails', 'childrenCount',
        'motherTongue', 'siblingsCount', 'marriedSiblingsCount',
        'houseStatus', 'parentsAlive', 'monthlyIncome',
        'marriageTimeline', 'demands', 'preferredCities',
        'contactNumber', 'hobbies', 'jahezOrHaqMehr'
    ];
    fields.forEach(f => {
        const el = document.getElementById(f);
        if (el) {
            if (el.type === 'number') el.value = data[f] || 0;
            else if (el.tagName === 'SELECT') el.value = data[f] || '';
            else el.value = data[f] !== undefined && data[f] !== null ? data[f] : '';
        }
    });
    // Show/hide previous marriage details
    togglePrevMarriage();
    // Show existing photo
    if (data.photoURL) {
        previewImg.src = data.photoURL;
        previewImg.style.display = 'block';
        photoPlaceholder.style.display = 'none';
    }
    updateProgressFromData(data);
}

// ----- Toggle previous marriage details -----
function togglePrevMarriage() {
    const status = maritalStatusSelect.value;
    prevMarriageGroup.style.display = (status === 'Divorced' || status === 'Widowed') ? 'block' : 'none';
}

maritalStatusSelect.addEventListener('change', togglePrevMarriage);

// ----- Photo Preview -----
photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = function(ev) {
            previewImg.src = ev.target.result;
            previewImg.style.display = 'block';
            photoPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
});

// ----- Form Submission (Save & Continue) -----
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();
    setLoading(true);
    try {
        const updateData = collectFormData();
        // If a new photo was selected, upload it first and get URL
        if (selectedFile) {
            const photoResult = await uploadProfilePhoto(uid, selectedFile);
            if (photoResult.success) {
                updateData.photoURL = photoResult.photoURL;
                // Don't set photoApproved flag here; uploadProfilePhoto already handled it
            } else {
                console.warn('Photo upload failed, profile will still be saved.');
            }
        }
        const result = await updateUserProfile(uid, updateData);
        if (result.success) {
            showMessage('Profile updated!', 'پروفائل اپ ڈیٹ ہو گیا!', false);
            updateProgressFromData(updateData);
            // Optionally trigger matching algorithm after profile completion
            // await runMatchingAlgorithm(uid);
        } else {
            showMessage(result.error || 'Update failed.', 'اپ ڈیٹ ناکام۔ دوبارہ کوشش کریں۔', true);
        }
    } catch (error) {
        showMessage('An error occurred.', 'ایک خرابی پیش آگئی۔', true);
        console.error('Profile save error:', error);
    } finally {
        setLoading(false);
    }
});

// ----- Skip for Now -----
skipBtn.addEventListener('click', () => {
    window.location.href = '../browse/browse.html';
});

// ----- Initialize Page -----
async function init() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = '../../auth/login/login.html';
        return;
    }
    uid = user.uid;

    // Fetch existing data
    const userData = await getUserData(uid);
    prefillForm(userData || {});
}

// ----- Load Floating Contact Button -----
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof loadComponent === 'function') {
        await loadComponent('../../components/floating-contact.html', document.body);
    }
});

// ----- Start -----
init();
