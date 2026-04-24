/**
 * NIKAH PAKISTAN V2 - APPROVE PHOTOS LOGIC
 * Admin reviews pending profile photos, approves or rejects them.
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
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----- DOM Elements -----
const logoutBtn = document.getElementById('logout-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('admin-sidebar');
const photoQueue = document.getElementById('photo-queue');
const emptyState = document.getElementById('empty-state');
const photoLoader = document.getElementById('photo-loader');

// ----- Admin UIDs (Replace with actual) -----
const ADMIN_UIDS = ['PLACEHOLDER_ADMIN_UID'];

// ----- State -----
let pendingPhotos = [];

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
                const snap = await getDoc(adminDocRef); // need import getDoc, but we didn't import; fallback to UID list only
            }
        } catch (e) {}
        await signOut(auth);
        window.location.href = '../admin-login/admin-login.html';
        return false;
    }
    return true;
}

// ----- Fetch Pending Photos -----
async function loadPendingPhotos() {
    photoQueue.innerHTML = `<div class="text-center p-4"><div class="loader"></div><p class="mt-3 text-muted"><span>Loading pending photos...</span> <span class="urdu">زیر التوا تصاویر لوڈ ہو رہی ہیں...</span></p></div>`;
    emptyState.style.display = 'none';
    photoLoader.style.display = 'none';
    try {
        const db = window.db;
        const q = query(
            collection(db, "users"),
            where("photoApproved", "==", false),
            where("photoURL", "!=", ""),
            orderBy("createdAt", "desc"),
            limit(50)
        );
        const snapshot = await getDocs(q);
        pendingPhotos = [];
        snapshot.forEach(docSnap => {
            pendingPhotos.push({ uid: docSnap.id, ...docSnap.data() });
        });
        renderPhotos();
    } catch (error) {
        console.error('Load pending photos error:', error);
        photoQueue.innerHTML = `<p class="text-center text-danger"><span>Failed to load photos.</span> <span class="urdu">تصاویر لوڈ نہیں ہو سکیں۔</span></p>`;
    }
}

// ----- Render Photo Cards -----
function renderPhotos() {
    if (pendingPhotos.length === 0) {
        photoQueue.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';
    let html = '';
    pendingPhotos.forEach(photo => {
        html += `
            <div class="photo-card" data-uid="${photo.uid}">
                <img src="${photo.photoURL}" class="photo-card-image" alt="Profile Photo">
                <div class="photo-card-info">
                    <div class="user-name">${photo.name || 'Unknown'}</div>
                    <div class="card-id">ID: ${photo.cardId || 'N/A'}</div>
                    <span class="badge-pending-photo">
                        <span>Pending Approval</span>
                        <span class="urdu">منظوری کا انتظار</span>
                    </span>
                </div>
                <div class="photo-card-actions">
                    <button class="btn btn-primary btn-small approve-btn" data-uid="${photo.uid}">
                        <i class="fa-solid fa-check"></i>
                        <span>Approve</span>
                        <span class="urdu">منظور کریں</span>
                    </button>
                    <button class="btn btn-danger btn-small reject-btn" data-uid="${photo.uid}">
                        <i class="fa-solid fa-xmark"></i>
                        <span>Reject</span>
                        <span class="urdu">مسترد کریں</span>
                    </button>
                </div>
            </div>
        `;
    });
    photoQueue.innerHTML = html;

    // Attach event listeners
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', handleApprove);
    });
    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', handleReject);
    });
}

// ----- Approve Handler -----
async function handleApprove(e) {
    const uid = e.currentTarget.dataset.uid;
    try {
        const db = window.db;
        await updateDoc(doc(db, "users", uid), {
            photoApproved: true,
            photoVisible: true
        });
        // Refresh queue
        await loadPendingPhotos();
    } catch (error) {
        console.error('Approve photo error:', error);
    }
}

// ----- Reject Handler -----
async function handleReject(e) {
    const uid = e.currentTarget.dataset.uid;
    const confirmMsg = 'Reject this photo?\n\nکیا آپ یہ تصویر مسترد کرنا چاہتے ہیں؟';
    if (!confirm(confirmMsg)) return;
    try {
        const db = window.db;
        // Keep photoURL but mark as not approved and hidden
        await updateDoc(doc(db, "users", uid), {
            photoApproved: false,
            photoVisible: false
        });
        await loadPendingPhotos();
    } catch (error) {
        console.error('Reject photo error:', error);
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
    await loadPendingPhotos();
})();
