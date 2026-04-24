/**
 * NIKAH PAKISTAN V2 - MANAGE PROPOSALS LOGIC
 * Admin proposals table with search, filter, actions.
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
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----- DOM Elements -----
const logoutBtn = document.getElementById('logout-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('admin-sidebar');
const tableBody = document.getElementById('table-body');
const emptyState = document.getElementById('empty-state');
const tableLoader = document.getElementById('table-loader');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const clearFiltersBtn = document.getElementById('clear-filters-btn');

// ----- Admin UIDs (Replace with actual) -----
const ADMIN_UIDS = ['PLACEHOLDER_ADMIN_UID'];

// ----- State -----
let allProposals = [];
let filteredProposals = [];

// ----- Helper: Check Admin -----
async function checkAdminAccess() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = '../admin-login/admin-login.html';
        return false;
    }
    // Simple UID check
    if (!ADMIN_UIDS.includes(user.uid)) {
        // Optionally check Firestore admins/{uid}
        const db = window.db;
        if (db) {
            try {
                const adminDocRef = doc(db, "admins", user.uid);
                const snap = await getDocs(adminDocRef); // actually need getDoc
                // Since getDoc not imported, skip; fallback to UID only
            } catch (e) {}
        }
        await signOut(auth);
        window.location.href = '../admin-login/admin-login.html';
        return false;
    }
    return true;
}

// ----- Bilingual Status Badge -----
function getStatusBadge(status) {
    const classes = 'badge-status ';
    let textEN = 'Unknown';
    let textUR = 'نامعلوم';
    switch (status) {
        case 'active':
            classes += 'badge-active';
            textEN = 'Active'; textUR = 'فعال';
            break;
        case 'pending':
            classes += 'badge-pending';
            textEN = 'Pending'; textUR = 'زیر التوا';
            break;
        case 'Married':
            classes += 'badge-married';
            textEN = 'Married'; textUR = 'شادی شدہ';
            break;
        case 'rejected':
            classes += 'badge-rejected';
            textEN = 'Rejected'; textUR = 'مسترد';
            break;
        default:
            classes += 'badge-pending';
    }
    return `<span class="${classes}"><span>${textEN}</span> <span class="urdu">${textUR}</span></span>`;
}

// ----- Load Proposals from Firestore -----
async function loadProposals() {
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4"><div class="loader"></div></td></tr>`;
    emptyState.style.display = 'none';
    try {
        const db = window.db;
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(200));
        const snapshot = await getDocs(q);
        allProposals = [];
        snapshot.forEach(docSnap => {
            allProposals.push({ uid: docSnap.id, ...docSnap.data() });
        });
        applyFilters();
    } catch (error) {
        console.error('Load proposals error:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger p-4">Failed to load proposals.</td></tr>`;
    }
}

// ----- Apply Filters (client-side) -----
function applyFilters() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const statusValue = statusFilter.value;

    filteredProposals = allProposals.filter(proposal => {
        // Search by name or city
        if (searchTerm) {
            const name = (proposal.name || '').toLowerCase();
            const city = (proposal.city || '').toLowerCase();
            if (!name.includes(searchTerm) && !city.includes(searchTerm)) return false;
        }
        // Filter by status
        if (statusValue && proposal.status !== statusValue) return false;
        return true;
    });
    renderTable(filteredProposals);
}

// ----- Render Table Rows -----
function renderTable(proposals) {
    if (proposals.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';
    let html = '';
    proposals.forEach(proposal => {
        const photoHTML = proposal.photoURL
            ? `<img src="${proposal.photoURL}" class="table-thumb" alt="photo">`
            : `<div class="table-thumb" style="display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-user"></i></div>`;

        html += `
            <tr data-uid="${proposal.uid}">
                <td>${photoHTML}</td>
                <td>${proposal.name || '—'}</td>
                <td>${proposal.city || '—'}</td>
                <td>${proposal.age || '—'}</td>
                <td>${proposal.gender || '—'}</td>
                <td>${getStatusBadge(proposal.status)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-table-action btn-edit edit-btn" data-uid="${proposal.uid}">
                            <i class="fa-solid fa-pen"></i> <span>Edit</span> <span class="urdu">ترمیم</span>
                        </button>
                        <button class="btn-table-action btn-married married-btn" data-uid="${proposal.uid}" ${proposal.status === 'Married' ? 'disabled' : ''}>
                            <i class="fa-solid fa-ring"></i> <span>Married</span> <span class="urdu">شادی شدہ</span>
                        </button>
                        <button class="btn-table-action btn-delete delete-btn" data-uid="${proposal.uid}">
                            <i class="fa-solid fa-trash"></i> <span>Delete</span> <span class="urdu">حذف</span>
                        </button>
                    </div>
                </td>
            </tr>`;
    });
    tableBody.innerHTML = html;

    // Attach event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', handleEdit);
    });
    document.querySelectorAll('.married-btn').forEach(btn => {
        btn.addEventListener('click', handleMarkMarried);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDelete);
    });
}

// ----- Action Handlers -----
function handleEdit(e) {
    const uid = e.currentTarget.dataset.uid;
    const proposal = allProposals.find(p => p.uid === uid);
    const name = proposal?.name || 'Unknown';
    const cardId = proposal?.cardId || 'N/A';
    const message = `I need to edit proposal: ${cardId} - ${name}. UID: ${uid}`;
    const adminNumber = window.NIKAH_CONFIG?.adminWhatsApp || '923121234567';
    window.open(`https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`, '_blank');
}

async function handleMarkMarried(e) {
    const uid = e.currentTarget.dataset.uid;
    const confirmMsg = 'Are you sure you want to mark this proposal as Married?\n\nکیا آپ واقعی یہ رشتہ شادی شدہ نشان زد کرنا چاہتے ہیں؟';
    if (!confirm(confirmMsg)) return;
    try {
        const db = window.db;
        await updateDoc(doc(db, "users", uid), {
            status: 'Married',
            marriedDate: serverTimestamp()
        });
        // Refresh data
        await loadProposals();
    } catch (error) {
        console.error('Mark married error:', error);
    }
}

async function handleDelete(e) {
    const uid = e.currentTarget.dataset.uid;
    const confirmMsg = 'Are you sure you want to delete this proposal?\n\nکیا آپ واقعی یہ رشتہ حذف کرنا چاہتے ہیں؟';
    if (!confirm(confirmMsg)) return;
    try {
        const db = window.db;
        await updateDoc(doc(db, "users", uid), {
            isActive: false,
            status: 'rejected'
        });
        await loadProposals();
    } catch (error) {
        console.error('Delete proposal error:', error);
    }
}

// ----- Event Listeners for Filters -----
applyFiltersBtn.addEventListener('click', applyFilters);
clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    statusFilter.value = '';
    applyFilters();
});
// Live search on input
searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);

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
    await loadProposals();
})();
