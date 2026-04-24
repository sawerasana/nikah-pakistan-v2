/**
 * NIKAH PAKISTAN V2 - SUCCESS STORIES LOGIC
 * Fetches users with status "Married" and displays them
 * as success story cards.
 */

'use strict';

import { auth } from '../../firebase/firebase-config.js';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----- DOM Elements -----
const storiesGrid = document.getElementById('stories-grid');
const noStories = document.getElementById('no-stories');
const storiesLoader = document.getElementById('stories-loader');

// ----- Helper: Format Timestamp to Date String -----
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ----- Render Story Cards -----
function renderStories(stories) {
    // Clear the grid (removes loading placeholder)
    storiesGrid.innerHTML = '';

    if (stories.length === 0) {
        noStories.style.display = 'block';
        return;
    }
    noStories.style.display = 'none';

    stories.forEach(story => {
        const card = document.createElement('div');
        card.className = 'story-card';

        // Heart icon
        const icon = document.createElement('div');
        icon.className = 'story-icon';
        icon.innerHTML = '<i class="fa-solid fa-heart"></i>';

        // Names
        const names = document.createElement('div');
        names.className = 'story-names';
        if (story.spouseName) {
            names.innerHTML = `${story.name} & ${story.spouseName}`;
        } else {
            names.innerHTML = `${story.name} <span class="urdu">- رشتہ ملا</span>`;
        }

        // City
        const city = document.createElement('div');
        city.className = 'story-city';
        city.textContent = story.city || '';

        // Marriage date
        const date = document.createElement('div');
        date.className = 'story-date';
        date.textContent = story.marriedDate ? formatDate(story.marriedDate) : '';

        // Message
        const message = document.createElement('div');
        message.className = 'story-message';
        message.innerHTML = '<span>Alhamdulillah, Nikah completed!</span> <span class="urdu">الحمدللہ، نکاح ہو گیا!</span>';

        card.appendChild(icon);
        card.appendChild(names);
        if (city.textContent) card.appendChild(city);
        if (date.textContent) card.appendChild(date);
        card.appendChild(message);

        storiesGrid.appendChild(card);
    });
}

// ----- Load Stories from Firestore -----
async function loadStories() {
    try {
        const db = window.db;
        const q = query(
            collection(db, "users"),
            where("status", "==", "Married"),
            orderBy("updatedAt", "desc"),
            limit(30)
        );
        const snapshot = await getDocs(q);
        const stories = [];
        snapshot.forEach(doc => {
            stories.push({ id: doc.id, ...doc.data() });
        });
        renderStories(stories);
    } catch (error) {
        console.error('Error loading success stories:', error);
        // Show a friendly message if query fails
        storiesGrid.innerHTML = `
            <p class="text-center text-danger">
                <span>Failed to load stories. Please try again.</span>
                <span class="urdu">کہانیاں لوڈ نہیں ہو سکیں۔ دوبارہ کوشش کریں۔</span>
            </p>
        `;
    } finally {
        storiesLoader.style.display = 'none';
    }
}

// ----- Initialize Page -----
async function init() {
    const user = auth.currentUser;
    // Allow public view if not logged in (optional)
    if (!user) {
        // Redirect or just show as public? We'll allow public view.
        // But we'll still load stories.
    }
    await loadStories();
}

// ----- Load Floating Contact Button -----
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof loadComponent === 'function') {
        await loadComponent('../../components/floating-contact.html', document.body);
    }
});

// ----- Start -----
init();
