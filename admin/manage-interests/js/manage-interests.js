/**
 * NIKAH PAKISTAN V2 - MANAGE INTERESTS LOGIC
 * Admin views interests, changes status, contacts users.
 */

'use strict';

import { auth } from '../../firebase/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----- DOM Elements -----
const logoutBtn = document.getElementById('logout-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('admin-sidebar');
const tableBody = document.getElementById('table-body');
const emptyState = document.getElementById('empty-state');
const tableLoader = document.getElementById('table-loader');

// ----- Admin UIDs (Replace with actual) -----
const ADMIN_UIDS = ['PLACEHOLDER_ADMIN_UID'];

// ----- State -----
let allInterests = [];

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
                // Need getDoc, but not imported; fallback to UID list only
            }
        } catch (e) {}
        await signOut(auth);
        window.location.href = '../admin-login/admin-login.html';
        return false;
    }
    return true;
}

// ----- Bilingual Status Badge -----
function getStatusBadge(status) {
    let classes = 'badge-interest ';
    let textEN = 'Unknown';
    let textUR = 'نامعلوم';
    switch (status) {
        case 'pending':
            classes += 'badge-pending';
            textEN = 'Pending'; textUR = 'زیر التوا';
            break;
        case 'contacted':
            classes += 'badge-contacted';
            textEN = 'Contacted'; textUR = 'رابطہ کیا';
            break;
        case 'resolved':
            classes += 'badge-resolved';
            textEN = 'Resolved'; textUR = 'حل شدہ';
            break;
    }
    return `<span class="${classes}"><span>${textEN}</span> <span class="urdu">${textUR}</span></span>`;
}

// ----- Format Timestamp -----
function formatTimestamp(timestamp) {
    if (!timestamp || !timestamp.toDate) return '';
    return timestamp.toDate().toLocaleString('en-PK');
}

// ----- Load Interests from Firestore -----
async function loadInterests() {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4"><div class="loader"></div><p class="mt-2 text-muted"><span>Loading interests...</span> <span class="urdu">دلچسپیاں لوڈ ہو رہی ہیں...</span></p></td></tr>`;
    emptyState.style.display = 'none';
    try {
        const db = window.db;
        const q = query(collection(db, "interests"), orderBy("timestamp", "desc"), limit(100));
        const snapshot = await getDocs(q);
        allInterests = [];
        snapshot.forEach(docSnap => {
            allInterests.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderTable();
    } catch (error) {
        console.error('Load interests error:', error);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger p-4"><span>Failed to load interests.</span> <span class="urdu">دلچسپیاں لوڈ نہیں ہو سکیں۔</span></td></tr>`;
    }
}

// ----- Render Table -----
function renderTable() {
    if (allInterests.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';
    let html = '';
    allInterests.forEach(interest => {
        const contactNumber = interest.interestedUserContact || '';
        const userName = interest.interestedUserName || 'Unknown';
        const proposalId = interest.proposalId || 'N/A';
        const time = formatTimestamp(interest.timestamp);
        const statusHTML = getStatusBadge(interest.status || 'pending');

        html += `
            <tr data-id="${interest.id}">
                <td>${userName}</td>
                <td>${proposalId}</td>
                <td>${time}</td>
                <td>${statusHTML}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-table-action btn-contact contact-btn" data-contact="${contactNumber}" data-username="${userName}" data-proposal="${proposalId}">
                            <i class="fa-brands fa-whatsapp"></i> <span>Contact</span> <span class="urdu">رابطہ</span>
                        </button>
                        <button class="btn-table-action btn-contacted contacted-btn" data-id="${interest.id}" ${interest.status === 'contacted' || interest.status === 'resolved' ? 'disabled' : ''}>
                            <i class="fa-solid fa-check"></i> <span>Contacted</span> <span class="urdu">رابطہ کیا</span>
                        </button>
                        <button class="btn-table-action btn-resolved resolved-btn" data-id="${interest.id}" ${interest.status === 'resolved' ? 'disabled' : ''}>
                            <i class="fa-solid fa-check-double"></i> <span>Resolved</span> <span class="urdu">حل شدہ</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    tableBody.innerHTML = html;

    // Attach event listeners
    document.querySelectorAll('.contact-btn').forEach(btn => {
        btn.addEventListener('click', handleContact);
    });
    document.querySelectorAll('.contacted-btn').forEach(btn => {
        btn.addEventListener('click', handleMarkContacted);
    });
    document.querySelectorAll('.resolved-btn').forEach(btn => {
        btn.addEventListener('click', handleMarkResolved);
    });
}

// ----- WhatsApp Contact Handler -----
function handleContact(e) {
    const btn = e.currentTarget;
    let phone = btn.dataset.contact;
    const userName = btn.dataset.username;
    const proposalId = btn.dataset.proposal;

    // If no contact number saved, use admin's fallback message
    let message = '';
    if (phone) {
        message = `Assalam-o-Alaikum ${userName}, admin from Nikah Pakistan here regarding your interest in Proposal ID: ${proposalId}.`;
    } else {
        // Use admin number and construct message for admin to forward
        phone = window.NIKAH_CONFIG?.adminWhatsApp || '923121234567';
        message = `Admin, please contact ${userName} regarding Proposal ID: ${proposalId} (interest recorded, but no contact number saved).`;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// ----- Mark as Contacted -----
async function handleMarkContacted(e) {
    const interestId = e.currentTarget.dataset.id;
    try {
        const db = window.db;
        await updateDoc(doc(db, "interests", interestId), { status: 'contacted' });
        await loadInterests();
    } catch (error) {
        console.error('Mark contacted error:', error);
    }
}

// ----- Mark as Resolved -----
async function handleMarkResolved(e) {
    const interestId = e.currentTarget.dataset.id;
    try {
        const db = window.db;
        await updateDoc(doc(db, "interests", interestId), { status: 'resolved' });
        await loadInterests();
    } catch (error) {
        console.error('Mark resolved error:', error);
    }
}

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
    await loadInterests();
})();
