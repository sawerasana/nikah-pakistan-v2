/**
 * NIKAH PAKISTAN V2 - NOTIFICATIONS / MATCHES LOGIC
 * Fetches smart matches, displays them with reasons,
 * supports dismiss and view profile actions.
 */

'use strict';

import { auth } from '../../firebase/firebase-config.js';
import {
    collection,
    query,
    orderBy,
    getDocs,
    updateDoc,
    doc,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----- DOM Elements -----
const matchesList = document.getElementById('matches-list');
const noMatches = document.getElementById('no-matches');
const matchError = document.getElementById('match-error');
const retryBtn = document.getElementById('retry-btn');
const matchesLoader = document.getElementById('matches-loader');

// ----- State -----
let uid = null;

// ----- Helper: Show Loading -----
function setLoading(loading) {
    matchesLoader.style.display = loading ? 'block' : 'none';
}

// ----- Render Matches -----
function renderMatches(matches) {
    // Clear list
    matchesList.innerHTML = '';
    if (matches.length === 0) {
        noMatches.style.display = 'block';
        return;
    }
    noMatches.style.display = 'none';

    matches.forEach(match => {
        const card = createMatchCard(match);
        matchesList.appendChild(card);
    });
}

// ----- Create Match Card -----
function createMatchCard(match) {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.dataset.matchId = match.id;

    // Thumbnail
    const thumb = document.createElement('div');
    thumb.className = 'match-thumb';
    if (match.photoURL) {
        const img = document.createElement('img');
        img.src = match.photoURL;
        img.alt = match.proposalName || 'Match';
        thumb.appendChild(img);
    } else {
        thumb.innerHTML = '<i class="fa-solid fa-user"></i>';
    }

    // Info
    const info = document.createElement('div');
    info.className = 'match-info';

    const name = document.createElement('div');
    name.className = 'match-name';
    name.textContent = match.proposalName || 'Anonymous';

    const meta = document.createElement('div');
    meta.className = 'match-meta';
    const ageSpan = document.createElement('span');
    ageSpan.innerHTML = `<i class="fa-solid fa-calendar-days"></i> Age: ${match.proposalAge || '—'}`;
    const citySpan = document.createElement('span');
    citySpan.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${match.proposalCity || '—'}`;
    meta.appendChild(ageSpan);
    meta.appendChild(citySpan);

    // Score Badge
    const scoreBadge = document.createElement('div');
    scoreBadge.className = 'match-score';
    scoreBadge.innerHTML = `<i class="fa-solid fa-star"></i> ${match.matchScore || 0}% <span class="urdu">میچ</span>`;

    // Reasons
    const reasonsDiv = document.createElement('div');
    reasonsDiv.className = 'match-reasons';
    if (match.matchReasons && Array.isArray(match.matchReasons)) {
        match.matchReasons.forEach(reason => {
            const reasonItem = document.createElement('span');
            reasonItem.className = reason.matched ? 'reason-item reason-match' : 'reason-item reason-nomatch';
            const icon = document.createElement('i');
            icon.className = reason.matched ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark';
            const text = document.createElement('span');
            text.textContent = reason.text || '';
            reasonItem.appendChild(icon);
            reasonItem.appendChild(text);
            reasonsDiv.appendChild(reasonItem);
        });
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'match-actions';

    const viewBtn = document.createElement('a');
    viewBtn.href = `../card-detail/card-detail.html?uid=${match.proposalOwnerUid}`;
    viewBtn.className = 'btn btn-primary btn-small';
    viewBtn.innerHTML = '<span>View Profile</span> <span class="urdu">پروفائل دیکھیں</span>';

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'btn btn-secondary btn-small';
    dismissBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> <span>Dismiss</span> <span class="urdu">نظر انداز</span>';
    dismissBtn.addEventListener('click', async () => {
        await dismissMatch(match.id, card);
    });

    actions.appendChild(viewBtn);
    actions.appendChild(dismissBtn);

    // Assemble
    info.appendChild(name);
    info.appendChild(meta);
    info.appendChild(scoreBadge);
    info.appendChild(reasonsDiv);
    info.appendChild(actions);

    card.appendChild(thumb);
    card.appendChild(info);

    return card;
}

// ----- Dismiss a Match -----
async function dismissMatch(matchId, cardElement) {
    try {
        const db = window.db;
        const matchRef = doc(db, "matches", uid, "user_matches", matchId);
        await updateDoc(matchRef, { isNotified: true });
        // Remove card from DOM
        cardElement.remove();
        // If list becomes empty, show empty state
        if (matchesList.children.length === 0) {
            noMatches.style.display = 'block';
        }
    } catch (error) {
        console.error('Dismiss match error:', error);
    }
}

// ----- Load Matches -----
async function loadMatches() {
    setLoading(true);
    noMatches.style.display = 'none';
    matchError.style.display = 'none';
    try {
        const db = window.db;
        const matchesRef = collection(db, "matches", uid, "user_matches");
        const q = query(matchesRef, where("isNotified", "==", false), orderBy("matchScore", "desc"));
        const snap = await getDocs(q);
        const matches = [];
        snap.forEach(docSnap => {
            matches.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderMatches(matches);
    } catch (error) {
        console.error('Load matches error:', error);
        matchesList.innerHTML = '';
        matchError.style.display = 'block';
    } finally {
        setLoading(false);
    }
}

// ----- Initialize Page -----
async function init() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = '../../auth/login/login.html';
        return;
    }
    uid = user.uid;
    await loadMatches();
}

// ----- Retry Button -----
retryBtn.addEventListener('click', async () => {
    await loadMatches();
});

// ----- Load Floating Contact Button -----
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof loadComponent === 'function') {
        await loadComponent('../../components/floating-contact.html', document.body);
    }
});

// ----- Start -----
init();
