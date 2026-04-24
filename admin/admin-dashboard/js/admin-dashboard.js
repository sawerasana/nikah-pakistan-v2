/**
 * NIKAH PAKISTAN V2 - ADMIN DASHBOARD LOGIC
 * Admin auth check, stats cards, recent activity,
 * logout, and sidebar toggle.
 */

'use strict';

import { auth } from '../../firebase/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----- DOM Elements -----
const logoutBtn = document.getElementById('logout-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('admin-sidebar');
const adminNameDisplay = document.getElementById('admin-name-display');

const statActive = document.getElementById('stat-active');
const statPending = document.getElementById('stat-pending');
const statInterests = document.getElementById('stat-interests');
const statMarried = document.getElementById('stat-married');
const activityList = document.getElementById('activity-list');

// ----- Admin Authorized UIDs (Replace with actual admin UIDs) -----
const ADMIN_UIDS = [
    'PLACEHOLDER_ADMIN_UID'
];

// ----- Helper: Check if a UID is admin (same as admin-login.js) -----
async function isAdmin(uid) {
    if (ADMIN_UIDS.includes(uid)) return true;
    try {
        const db = window.db;
        if (!db) return false;
        const adminDocRef = doc(db, "admins", uid);
        const snap = await getDoc(adminDocRef);
        return snap.exists();
    } catch (error) {
        console.warn('Admin check failed:', error);
        return false;
    }
}

// ----- Check Admin Access on Load -----
async function checkAdminAccess() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = '../admin-login/admin-login.html';
        return false;
    }
    const allowed = await isAdmin(user.uid);
    if (!allowed) {
        await signOut(auth);
        window.location.href = '../admin-login/admin-login.html';
        return false;
    }
    // Show admin name/email
    adminNameDisplay.textContent = user.email || 'Admin';
    return true;
}

// ----- Fetch Stats -----
async function loadStats() {
    const db = window.db;
    if (!db) return;

    // Active proposals (isActive == true and status == 'active')
    try {
        const qActive = query(collection(db, "users"), where("isActive", "==", true), where("status", "==", "active"));
        const snapActive = await getDocs(qActive);
        statActive.textContent = snapActive.size;
    } catch (e) {
        statActive.textContent = '...';
        console.error(e);
    }

    // Pending proposals
    try {
        const qPending = query(collection(db, "users"), where("status", "==", "pending"));
        const snapPending = await getDocs(qPending);
        statPending.textContent = snapPending.size;
    } catch (e) {
        statPending.textContent = '...';
        console.error(e);
    }

    // Today's interests (timestamp >= start of today)
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(todayStart);
        const qInterests = query(collection(db, "interests"), where("timestamp", ">=", todayTimestamp));
        const snapInterests = await getDocs(qInterests);
        statInterests.textContent = snapInterests.size;
    } catch (e) {
        statInterests.textContent = '...';
        console.error(e);
    }

    // Married proposals
    try {
        const qMarried = query(collection(db, "users"), where("status", "==", "Married"));
        const snapMarried = await getDocs(qMarried);
        statMarried.textContent = snapMarried.size;
    } catch (e) {
        statMarried.textContent = '...';
        console.error(e);
    }
}

// ----- Load Recent Activity (from interests collection) -----
async function loadRecentActivity() {
    const db = window.db;
    if (!db) return;
    try {
        const q = query(collection(db, "interests"), orderBy("timestamp", "desc"), limit(10));
        const snap = await getDocs(q);
        if (snap.empty) {
            activityList.innerHTML = `<p class="text-muted text-small"><span>No recent activity.</span> <span class="urdu">کوئی حالیہ سرگرمی نہیں۔</span></p>`;
            return;
        }
        let html = '<ul style="list-style: none; padding: 0;">';
        snap.forEach(docSnap => {
            const interest = docSnap.data();
            const time = interest.timestamp ? interest.timestamp.toDate().toLocaleString('en-PK') : '';
            html += `
                <li class="activity-item" style="border-bottom: 1px dashed var(--color-border-light); padding: var(--space-2) 0;">
                    <span class="text-small font-medium">${interest.interestedUserName || 'User'}</span>
                    <span class="text-small text-muted"> - Proposal: ${interest.proposalId || ''}</span>
                    <span class="text-small text-muted" style="float: right;">${time}</span>
                </li>
            `;
        });
        html += '</ul>';
        activityList.innerHTML = html;
    } catch (e) {
        activityList.innerHTML = `<p class="text-danger text-small">Failed to load activity.</p>`;
        console.error(e);
    }
}

// ----- Logout -----
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = '../admin-login/admin-login.html';
    } catch (e) {
        console.error('Logout error:', e);
    }
});

// ----- Sidebar Toggle (Mobile) -----
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// ----- Initialize -----
(async function init() {
    const access = await checkAdminAccess();
    if (!access) return;
    await loadStats();
    await loadRecentActivity();
})();
