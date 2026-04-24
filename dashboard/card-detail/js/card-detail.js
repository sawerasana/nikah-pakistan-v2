/**
 * NIKAH PAKISTAN V2 - PROPOSAL DETAIL PAGE LOGIC
 * Fetches a single proposal by UID (from URL query),
 * displays full details with photo privacy,
 * and handles the "Interested" WhatsApp link.
 */

'use strict';

import { auth } from '../../firebase/firebase-config.js';
import { getUserData } from '../../firebase/firebase-services.js';

// ----- DOM Elements -----
const detailCard = document.getElementById('detail-card');
const detailName = document.getElementById('detail-name');
const detailMeta = document.getElementById('detail-meta');
const detailSections = document.getElementById('detail-sections');
const detailPhoto = document.getElementById('detail-photo');
const photoLockIcon = document.getElementById('photo-lock-icon');
const photoRequestText = document.getElementById('photo-request-text');
const verifiedBadge = document.getElementById('verified-badge');
const interestedBtn = document.getElementById('interested-btn');
const detailError = document.getElementById('detail-error');
const detailLoader = document.getElementById('detail-loader');
const detailMessage = document.getElementById('detail-message');

// ----- State -----
let currentUserData = null;
let proposalData = null;

// ----- Helpers: Bilingual Error/Success -----
function showDetailMessage(english, urdu, isError = false) {
    detailMessage.style.display = 'block';
    detailMessage.innerHTML = `<span>${english}</span> <span class="urdu">${urdu}</span>`;
    detailMessage.className = isError ? 'form-message error' : 'form-message success';
}

function hideDetailMessage() {
    detailMessage.style.display = 'none';
}

// ----- Get UID from URL -----
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// ----- Render Photo with Privacy Logic -----
function renderPhoto() {
    if (!proposalData) return;
    const photoURL = proposalData.photoURL;
    const isVisible = proposalData.photoVisible === true;

    if (photoURL) {
        detailPhoto.src = photoURL;
    } else {
        detailPhoto.src = '../../assets/images/placeholder-profile.png';
    }

    // Blur and lock if not visible
    if (!isVisible && photoURL) {
        detailPhoto.classList.add('blurred');
        photoLockIcon.style.display = 'block';
        photoRequestText.style.display = 'block';
    } else {
        detailPhoto.classList.remove('blurred');
        photoLockIcon.style.display = 'none';
        photoRequestText.style.display = 'none';
    }

    // Verified badge
    if (proposalData.isVerified) {
        verifiedBadge.style.display = 'inline-flex';
    } else {
        verifiedBadge.style.display = 'none';
    }
}

// ----- Build Sections HTML -----
function renderSections() {
    if (!proposalData) return;

    const sections = [
        {
            titleEN: 'Personal Details',
            titleUR: 'ذاتی معلومات',
            fields: [
                { labelEN: 'Height', labelUR: 'قد', key: 'height' },
                { labelEN: 'Complexion', labelUR: 'رنگ', key: 'complexion' },
                { labelEN: 'Caste', labelUR: 'قوم', key: 'caste' },
                { labelEN: 'Tehsil', labelUR: 'تحصیل', key: 'tehsil' },
                { labelEN: 'District', labelUR: 'ضلع', key: 'district' },
                { labelEN: 'Maslak', labelUR: 'مسلک', key: 'maslak' }
            ]
        },
        {
            titleEN: 'Education & Profession',
            titleUR: 'تعلیم اور پیشہ',
            fields: [
                { labelEN: 'Education', labelUR: 'تعلیم', key: 'education' },
                { labelEN: 'Religious Education', labelUR: 'دینی تعلیم', key: 'religiousEducation' },
                { labelEN: 'Profession', labelUR: 'پیشہ', key: 'profession' }
            ]
        },
        {
            titleEN: 'Family & Lifestyle',
            titleUR: 'خاندان اور طرزِ زندگی',
            fields: [
                { labelEN: 'Marital Status', labelUR: 'ازدواجی حیثیت', key: 'maritalStatus' },
                { labelEN: 'Previous Marriage Details', labelUR: 'پچھلی شادی کی تفصیل', key: 'previousMarriageDetails' },
                { labelEN: 'Children', labelUR: 'بچے', key: 'childrenCount', isNumber: true },
                { labelEN: 'Mother Tongue', labelUR: 'مادری زبان', key: 'motherTongue' },
                { labelEN: 'Siblings', labelUR: 'بہن بھائی', key: 'siblingsCount', isNumber: true },
                { labelEN: 'Married Siblings', labelUR: 'شادی شدہ بہن بھائی', key: 'marriedSiblingsCount', isNumber: true },
                { labelEN: 'House Status', labelUR: 'گھر', key: 'houseStatus' },
                { labelEN: 'Parents Alive', labelUR: 'والدین', key: 'parentsAlive' },
                { labelEN: 'Monthly Income', labelUR: 'ماہانہ آمدن', key: 'monthlyIncome' }
            ]
        },
        {
            titleEN: 'Partner Preferences',
            titleUR: 'پسندیدہ رشتے کی تفصیلات',
            fields: [
                { labelEN: 'Marriage Timeline', labelUR: 'شادی کب تک', key: 'marriageTimeline' },
                { labelEN: 'Demands', labelUR: 'ڈیمانڈ', key: 'demands' },
                { labelEN: 'Preferred Cities', labelUR: 'پسندیدہ شہر', key: 'preferredCities' }
            ]
        },
        {
            titleEN: 'Contact & Additional Info',
            titleUR: 'رابطہ اور اضافی معلومات',
            fields: [
                { labelEN: 'Contact Number', labelUR: 'رابطہ نمبر', key: 'contactNumber', isPrivate: true },
                { labelEN: 'Hobbies', labelUR: 'مشاغل', key: 'hobbies' },
                { labelEN: 'Jahez / Haq Mehr', labelUR: 'جہیز / حق مہر', key: 'jahezOrHaqMehr' }
            ]
        }
    ];

    let html = '';
    sections.forEach(section => {
        html += `<div class="detail-section-block">`;
        html += `<h3 class="detail-section-title"><span>${section.titleEN}</span> <span class="urdu">${section.titleUR}</span></h3>`;
        section.fields.forEach(field => {
            let value = proposalData[field.key];
            if (field.isPrivate) {
                value = '<span class="text-not-specified">Hidden (contact via admin) <span class="urdu">پوشیدہ (ایڈمن سے رابطہ کریں)</span></span>';
            } else if (value === undefined || value === null || value === '' || (field.isNumber && value === 0)) {
                value = `<span class="text-not-specified">Not specified <span class="urdu">درج نہیں</span></span>`;
            } else {
                value = `<span>${value}</span>`;
            }
            html += `<div class="detail-field"><span class="label"><span>${field.labelEN}</span> <span class="urdu">${field.labelUR}</span></span><span class="value">${value}</span></div>`;
        });
        html += `</div>`;
    });

    detailSections.innerHTML = html;
}

// ----- Render Basic Meta (Name, Age, City, Gender, Card ID) -----
function renderMeta() {
    if (!proposalData) return;
    detailName.textContent = proposalData.name || 'Anonymous';
    const age = proposalData.age || '—';
    const city = proposalData.city || '—';
    const gender = proposalData.gender || '—';
    const cardId = proposalData.cardId || '';
    detailMeta.innerHTML = `
        <span><i class="fa-solid fa-venus-mars"></i> ${gender}</span>
        <span><i class="fa-solid fa-calendar"></i> Age: ${age}</span>
        <span><i class="fa-solid fa-city"></i> ${city}</span>
        ${cardId ? `<span><i class="fa-solid fa-id-card"></i> ${cardId}</span>` : ''}
    `;
}

// ----- Handle "Interested" Click -----
interestedBtn.addEventListener('click', () => {
    if (!proposalData || !currentUserData) {
        showDetailMessage('Cannot express interest. Please log in and try again.', 'دلچسپی ظاہر نہیں کی جا سکتی۔ براہ کرم لاگ ان کریں۔', true);
        return;
    }
    const cardData = {
        cardId: proposalData.cardId,
        name: proposalData.name,
        age: proposalData.age,
        city: proposalData.city || '',
        education: proposalData.education || '',
        profession: proposalData.profession || ''
    };
    const userData = {
        name: currentUserData.name,
        age: currentUserData.age,
        city: currentUserData.city || '',
        contact: currentUserData.contactNumber || currentUserData.email || ''
    };
    if (typeof window.generateInterestWhatsAppLink === 'function') {
        const link = window.generateInterestWhatsAppLink(cardData, userData);
        window.open(link, '_blank');
    } else {
        showDetailMessage('Contact function not available.', 'رابطہ فنکشن دستیاب نہیں۔', true);
    }
});

// ----- Initialize Page -----
async function init() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = '../../auth/login/login.html';
        return;
    }
    // Fetch current user's own data for interested message
    currentUserData = await getUserData(user.uid);

    const uidParam = getQueryParam('uid');
    if (!uidParam) {
        detailCard.style.display = 'none';
        detailError.style.display = 'block';
        return;
    }

    try {
        detailLoader.style.display = 'block';
        proposalData = await getUserData(uidParam);
        if (!proposalData || !proposalData.isActive) {
            throw new Error('Not found');
        }
        // Exclude sensitive fields like email, contactNumber for display
        // Already getUserData returns full doc; we just won't show contact.
        renderPhoto();
        renderMeta();
        renderSections();
        detailCard.style.display = 'block';
    } catch (error) {
        console.error('Load proposal detail error:', error);
        detailCard.style.display = 'none';
        detailError.style.display = 'block';
    } finally {
        detailLoader.style.display = 'none';
    }
}

// ----- Load Floating Contact Button -----
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof loadComponent === 'function') {
        await loadComponent('../../components/floating-contact.html', document.body);
    }
});

// ----- Start -----
init();
