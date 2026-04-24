/**
 * NIKAH PAKISTAN V2 - BROWSE PROPOSALS LOGIC
 * Fetches proposals, renders cards, applies filters,
 * pagination, interested button, and loads floating contact.
 */

'use strict';

import { auth } from '../../firebase/firebase-config.js';
import {
    getUserData,
    getAllActiveProposals,
    getProposalsByFilters
} from '../../firebase/firebase-services.js';

// ----- DOM Elements -----
const cardsGrid = document.getElementById('cards-grid');
const noResults = document.getElementById('no-results');
const loadMoreContainer = document.getElementById('load-more-container');
const loadMoreBtn = document.getElementById('load-more-btn');
const loadMoreLoader = document.getElementById('load-more-loader');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const resultsInfo = document.getElementById('results-info');
const resultsCount = document.getElementById('results-count');

const filterAgeMin = document.getElementById('filter-age-min');
const filterAgeMax = document.getElementById('filter-age-max');
const filterCity = document.getElementById('filter-city');
const filterEducation = document.getElementById('filter-education');
const filterMarital = document.getElementById('filter-marital');

// ----- State -----
let currentUser = null;
let currentUserData = null;
let allProposals = [];            // all fetched proposals (unfiltered)
let lastVisible = null;          // for pagination
let hasMore = true;
let isLoading = false;
let currentFilters = {};         // active filter object

// ----- Constants -----
const PAGE_SIZE = 20;

// ----- Initialize Page -----
async function init() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = '../../auth/login/login.html';
        return;
    }
    currentUser = user;
    currentUserData = await getUserData(user.uid);
    if (!currentUserData) {
        // If no data, redirect to profile
        window.location.href = '../profile/profile.html';
        return;
    }

    // Set default filters: opposite gender, age range ±5
    const oppositeGender = currentUserData.gender === 'Male' ? 'Female' : 'Male';
    const userAge = currentUserData.age || 25;
    const ageRange = 5;
    const defaultMin = Math.max(18, userAge - ageRange);
    const defaultMax = userAge + ageRange;

    currentFilters = {
        gender: oppositeGender,
        ageMin: defaultMin,
        ageMax: defaultMax,
        city: '',
        education: '',
        maritalStatus: ''
    };

    filterAgeMin.value = defaultMin;
    filterAgeMax.value = defaultMax;

    await loadProposals(true);
}

// ----- Load Proposals (first batch or load more) -----
async function loadProposals(reset = false) {
    if (isLoading) return;
    isLoading = true;

    if (reset) {
        allProposals = [];
        lastVisible = null;
        hasMore = true;
        cardsGrid.innerHTML = ''; // will show loading placeholder later
    }

    loadMoreContainer.style.display = 'none';
    loadMoreLoader.style.display = 'block';

    try {
        const result = await getAllActiveProposals(PAGE_SIZE, reset ? null : lastVisible);
        const newProposals = result.proposals || [];

        allProposals = reset ? newProposals : allProposals.concat(newProposals);
        lastVisible = result.lastVisible;
        hasMore = newProposals.length === PAGE_SIZE && lastVisible !== null;

        // Apply current filters
        const filtered = applyFiltersToArray(allProposals, currentFilters);
        renderCards(filtered);
        updateResultsInfo(filtered.length);
        updateLoadMoreVisibility();

    } catch (error) {
        console.error('Error loading proposals:', error);
        cardsGrid.innerHTML = `<p class="text-center text-danger">Failed to load proposals.</p>`;
    } finally {
        isLoading = false;
        loadMoreLoader.style.display = 'none';
    }
}

// ----- Apply Filters to a given array -----
function applyFiltersToArray(proposals, filters) {
    return proposals.filter(proposal => {
        // Gender filter
        if (filters.gender && proposal.gender !== filters.gender) return false;

        // Age range
        if (filters.ageMin && proposal.age < parseInt(filters.ageMin)) return false;
        if (filters.ageMax && proposal.age > parseInt(filters.ageMax)) return false;

        // City (partial match)
        if (filters.city) {
            if (!proposal.city || !proposal.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
        }

        // Education (partial)
        if (filters.education) {
            if (!proposal.education || !proposal.education.toLowerCase().includes(filters.education.toLowerCase())) return false;
        }

        // Marital status (exact)
        if (filters.maritalStatus && proposal.maritalStatus !== filters.maritalStatus) return false;

        return true;
    });
}

// ----- Render Cards -----
function renderCards(proposals) {
    cardsGrid.innerHTML = '';

    if (proposals.length === 0) {
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    proposals.forEach(proposal => {
        const card = createProposalCard(proposal);
        cardsGrid.appendChild(card);
    });
}

// ----- Create a single proposal card -----
function createProposalCard(proposal) {
    const card = document.createElement('div');
    card.className = 'proposal-card';

    // Photo
    const photoWrapper = document.createElement('div');
    photoWrapper.className = 'card-photo-wrapper';

    const photoUrl = proposal.photoURL || ''; // default maybe placeholder
    const isPhotoVisible = proposal.photoVisible === true;

    const img = document.createElement('img');
    img.className = 'card-photo';
    if (!isPhotoVisible) {
        img.classList.add('blurred');
    }
    img.src = photoUrl || '../../assets/images/placeholder-profile.png'; // fallback
    img.alt = proposal.name || 'Profile';

    const lockOverlay = document.createElement('i');
    lockOverlay.className = 'fa-solid fa-lock photo-lock-overlay';
    if (!isPhotoVisible && photoUrl) {
        lockOverlay.classList.add('visible');
    } else {
        lockOverlay.classList.remove('visible');
    }

    photoWrapper.appendChild(img);
    photoWrapper.appendChild(lockOverlay);

    // Verified badge
    if (proposal.isVerified) {
        const badge = document.createElement('span');
        badge.className = 'verified-badge';
        badge.innerHTML = '<i class="fa-solid fa-check"></i> Verified';
        photoWrapper.appendChild(badge);
    }

    card.appendChild(photoWrapper);

    // Card content
    const content = document.createElement('div');
    content.className = 'card-content';

    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = proposal.name || 'Anonymous';

    const ageCity = document.createElement('div');
    ageCity.className = 'card-detail';
    ageCity.innerHTML = `<span class="label">Age:</span><span class="value">${proposal.age}</span>`;

    const cityDetail = document.createElement('div');
    cityDetail.className = 'card-detail';
    cityDetail.innerHTML = `<span class="label">City:</span><span class="value">${proposal.city || '—'}</span>`;

    const eduDetail = document.createElement('div');
    eduDetail.className = 'card-detail';
    eduDetail.innerHTML = `<span class="label">Education:</span><span class="value">${proposal.education || '—'}</span>`;

    const profDetail = document.createElement('div');
    profDetail.className = 'card-detail';
    profDetail.innerHTML = `<span class="label">Profession:</span><span class="value">${proposal.profession || '—'}</span>`;

    const interestedBtn = document.createElement('button');
    interestedBtn.className = 'btn btn-primary btn-small interested-btn';
    interestedBtn.innerHTML = '<span>Interested</span> <span class="urdu">دلچسپی ہے</span>';
    interestedBtn.addEventListener('click', () => {
        if (!currentUserData) return;
        // Build required data for WhatsApp link
        const cardData = {
            cardId: proposal.cardId,
            name: proposal.name,
            age: proposal.age,
            city: proposal.city || '',
            education: proposal.education || '',
            profession: proposal.profession || ''
        };
        const userData = {
            name: currentUserData.name,
            age: currentUserData.age,
            city: currentUserData.city || '',
            contact: currentUserData.contactNumber || currentUserData.email || ''
        };
        const link = window.generateInterestWhatsAppLink(cardData, userData);
        window.open(link, '_blank');
    });

    content.appendChild(name);
    content.appendChild(ageCity);
    content.appendChild(cityDetail);
    content.appendChild(eduDetail);
    content.appendChild(profDetail);
    content.appendChild(interestedBtn);

    card.appendChild(content);
    return card;
}

// ----- Update Results Info -----
function updateResultsInfo(count) {
    if (count > 0) {
        resultsInfo.style.display = 'block';
        resultsCount.textContent = count;
    } else {
        resultsInfo.style.display = 'none';
    }
}

// ----- Update Load More Visibility -----
function updateLoadMoreVisibility() {
    if (hasMore) {
        loadMoreContainer.style.display = 'flex';
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

// ----- Filter Handlers -----
applyFiltersBtn.addEventListener('click', () => {
    // Build filters from inputs
    const filters = {
        gender: currentFilters.gender, // keep opposite gender
        ageMin: filterAgeMin.value ? parseInt(filterAgeMin.value) : '',
        ageMax: filterAgeMax.value ? parseInt(filterAgeMax.value) : '',
        city: filterCity.value.trim(),
        education: filterEducation.value.trim(),
        maritalStatus: filterMarital.value
    };
    currentFilters = filters;
    const filtered = applyFiltersToArray(allProposals, currentFilters);
    renderCards(filtered);
    updateResultsInfo(filtered.length);
});

clearFiltersBtn.addEventListener('click', () => {
    // Reset to default opposite gender + age range
    const oppositeGender = currentUserData.gender === 'Male' ? 'Female' : 'Male';
    const userAge = currentUserData.age || 25;
    const defaultMin = Math.max(18, userAge - 5);
    const defaultMax = userAge + 5;

    filterAgeMin.value = defaultMin;
    filterAgeMax.value = defaultMax;
    filterCity.value = '';
    filterEducation.value = '';
    filterMarital.value = '';

    currentFilters = {
        gender: oppositeGender,
        ageMin: defaultMin,
        ageMax: defaultMax,
        city: '',
        education: '',
        maritalStatus: ''
    };
    const filtered = applyFiltersToArray(allProposals, currentFilters);
    renderCards(filtered);
    updateResultsInfo(filtered.length);
});

// ----- Load More -----
loadMoreBtn.addEventListener('click', async () => {
    // Fetch next batch from Firestore, but note filters applied client-side, so we just extend cache and re-apply
    if (isLoading || !hasMore) return;
    await loadProposals(false);
    // Re-apply filters to the updated allProposals
    const filtered = applyFiltersToArray(allProposals, currentFilters);
    renderCards(filtered);
    updateResultsInfo(filtered.length);
});

// ----- Load Floating Contact and Notification Bell -----
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof loadComponent === 'function') {
        await loadComponent('../../components/floating-contact.html', document.body);
        await loadComponent('../../components/notification-bell.html', document.getElementById('notification-bell-placeholder'));
    }
});

// ----- Kick off -----
init();
