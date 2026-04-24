/**
 * NIKAH PAKISTAN V2 - MY PROPOSALS PAGE LOGIC
 * Create new proposals, view existing ones,
 * send edit/delete requests to admin via WhatsApp.
 */

'use strict';

import { auth } from '../../firebase/firebase-config.js';
import {
    collection,
    addDoc,
    query,
    orderBy,
    getDocs,
    serverTimestamp,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----- DOM Elements -----
const tabButtons = document.querySelectorAll('.tab-btn');
const createPanel = document.getElementById('create-panel');
const listPanel = document.getElementById('list-panel');
const createForm = document.getElementById('create-proposal-form');
const proposalsContainer = document.getElementById('my-proposals-container');
const noProposals = document.getElementById('no-proposals');
const formMessage = document.getElementById('form-message');
const formLoader = document.getElementById('form-loader');
const previewImg = document.getElementById('preview-img');
const photoPlaceholder = document.getElementById('photo-placeholder');
const photoInput = document.getElementById('proposal-photo');

// ----- State -----
let selectedFile = null;
let uid = null;

// ----- Tab Switching -----
function switchTab(tabName) {
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
    [createPanel, listPanel].forEach(p => p.classList.remove('active'));
    if (tabName === 'create') {
        createPanel.classList.add('active');
    } else if (tabName === 'list') {
        listPanel.classList.add('active');
        loadUserProposals();
    }
}

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ----- Show Bilingual Message -----
function showFormMessage(english, urdu, isError = false) {
    formMessage.style.display = 'block';
    formMessage.innerHTML = `<span>${english}</span> <span class="urdu">${urdu}</span>`;
    formMessage.className = isError ? 'form-message error' : 'form-message success';
}

function hideFormMessage() {
    formMessage.style.display = 'none';
}

// ----- Loading State -----
function setLoading(loading) {
    const submitBtn = createForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = loading;
    formLoader.style.display = loading ? 'block' : 'none';
}

// ----- Photo Preview -----
photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            previewImg.src = ev.target.result;
            previewImg.style.display = 'block';
            photoPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
});

// ----- Collect Form Data -----
function collectProposalData() {
    const fields = [
        'name', 'gender', 'age', 'city', 'height', 'complexion', 'caste',
        'tehsil', 'district', 'maslak', 'education', 'religiousEducation',
        'profession', 'maritalStatus', 'previousMarriageDetails', 'childrenCount',
        'motherTongue', 'siblingsCount', 'marriedSiblingsCount', 'houseStatus',
        'parentsAlive', 'monthlyIncome', 'marriageTimeline', 'demands',
        'preferredCities', 'contactNumber', 'hobbies', 'jahezOrHaqMehr'
    ];
    const data = {};
    fields.forEach(field => {
        const el = document.getElementById(`prop-${field}`);
        if (el) {
            if (el.type === 'number') data[field] = el.value ? parseInt(el.value) : 0;
            else data[field] = el.value.trim();
        }
    });
    return data;
}

// ----- Create New Proposal -----
createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFormMessage();
    if (!uid) {
        showFormMessage('You are not logged in.', 'آپ لاگ ان نہیں ہیں۔', true);
        return;
    }

    const proposalData = collectProposalData();

    // Validate required fields
    if (!proposalData.name || !proposalData.gender || !proposalData.age || !proposalData.city) {
        showFormMessage('Please fill all required fields (Name, Gender, Age, City).', 'براہ کرم ضروری فیلڈز پُر کریں (نام، جنس، عمر، شہر)۔', true);
        return;
    }

    if (proposalData.age < 18) {
        showFormMessage('Age must be 18 or above.', 'عمر 18 یا اس سے زیادہ ہونی چاہیے۔', true);
        return;
    }

    setLoading(true);
    try {
        const db = window.db;
        const proposalsRef = collection(db, 'users', uid, 'proposals');
        await addDoc(proposalsRef, {
            ...proposalData,
            photoURL: null, // Photo upload not implemented yet
            status: 'pending',
            isActive: false, // will become active after admin approval
            createdAt: serverTimestamp()
        });

        showFormMessage('Proposal submitted for approval!', 'رشتہ منظوری کے لیے بھیج دیا گیا!', false);
        createForm.reset();
        selectedFile = null;
        previewImg.style.display = 'none';
        photoPlaceholder.style.display = 'block';
        // Switch to proposals list after 1.5 seconds
        setTimeout(() => switchTab('list'), 1500);
    } catch (error) {
        console.error('Create proposal error:', error);
        showFormMessage('Failed to submit proposal.', 'رشتہ جمع نہیں ہو سکا۔', true);
    } finally {
        setLoading(false);
    }
});

// ----- Load User Proposals -----
async function loadUserProposals() {
    if (!uid) return;
    const db = window.db;
    proposalsContainer.innerHTML = `<p class="text-center text-muted p-4"><span>Loading proposals...</span><span class="urdu">رشتے لوڈ ہو رہے ہیں...</span></p>`;
    noProposals.style.display = 'none';
    try {
        const proposalsRef = collection(db, 'users', uid, 'proposals');
        const q = query(proposalsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const proposals = [];
        snapshot.forEach(doc => {
            proposals.push({ id: doc.id, ...doc.data() });
        });

        if (proposals.length === 0) {
            proposalsContainer.innerHTML = '';
            noProposals.style.display = 'block';
            return;
        }

        renderProposals(proposals);
    } catch (error) {
        console.error('Load proposals error:', error);
        proposalsContainer.innerHTML = `<p class="text-center text-danger">Failed to load proposals.</p>`;
    }
}

// ----- Render Proposals List -----
function renderProposals(proposals) {
    proposalsContainer.innerHTML = '';
    proposals.forEach(proposal => {
        const item = document.createElement('div');
        item.className = 'proposal-list-item';

        // Thumbnail placeholder
        const thumb = document.createElement('div');
        thumb.className = 'proposal-thumb';
        thumb.innerHTML = '<i class="fa-solid fa-user fa-2x"></i>'; // placeholder, no emoji
        // If photoURL exists, show image
        if (proposal.photoURL) {
            const img = document.createElement('img');
            img.src = proposal.photoURL;
            img.alt = 'proposal';
            thumb.innerHTML = '';
            thumb.appendChild(img);
        }

        // Info
        const info = document.createElement('div');
        info.className = 'proposal-info';
        info.innerHTML = `
            <div class="prop-name">${proposal.name || 'Unknown'}</div>
            <div class="prop-meta">Age: ${proposal.age} | City: ${proposal.city || 'N/A'} | Status: 
                <span class="proposal-status-badge status-${proposal.status}">${proposal.status}</span>
            </div>
        `;

        // Actions (Edit & Delete - clickable to WhatsApp admin)
        const actions = document.createElement('div');
        actions.className = 'proposal-actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary btn-small';
        editBtn.innerHTML = '<span>Edit</span>';
        editBtn.addEventListener('click', () => {
            const message = `Admin, I want to edit my proposal ID: ${proposal.id} (Card: ${proposal.name}). Please assist.`;
            window.open(`https://wa.me/${NIKAH_CONFIG.adminWhatsApp}?text=${encodeURIComponent(message)}`, '_blank');
        });
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-small btn-outline-gold';
        deleteBtn.innerHTML = '<span>Delete</span>';
        deleteBtn.addEventListener('click', () => {
            const message = `Admin, I want to delete my proposal ID: ${proposal.id} (Card: ${proposal.name}). Please assist.`;
            window.open(`https://wa.me/${NIKAH_CONFIG.adminWhatsApp}?text=${encodeURIComponent(message)}`, '_blank');
        });
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        item.appendChild(thumb);
        item.appendChild(info);
        item.appendChild(actions);
        proposalsContainer.appendChild(item);
    });
}

// ----- Initialize Page -----
async function init() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = '../../auth/login/login.html';
        return;
    }
    uid = user.uid;
    // Initial proposals load if list tab is active (not yet, as default is create)
}

// ----- Load Floating Contact Button -----
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof loadComponent === 'function') {
        await loadComponent('../../components/floating-contact.html', document.body);
    }
});

// ----- Start -----
init();
