/**
 * ============================================
 * NIKAH PAKISTAN V2 - UNIVERSAL JAVASCRIPT
 * Premium Matrimonial Platform
 * ============================================
 * This file contains the global configuration object
 * and all reusable helper functions.
 * No emojis, completely professional.
 * ============================================
 */

'use strict';

// ---------- 1. GLOBAL CONFIGURATION OBJECT ----------
const NIKAH_CONFIG = {
    // Site Identity
    siteName: 'Nikah Pakistan',
    siteUrduName: 'نکاح پاکستان',
    
    // Admin Contact
    adminWhatsApp: '923439850348',           // Placeholder – replace with your number (country code, no +)
    adminContactRaw: '923439850348',         // Same as above, used for WhatsApp links
    adminName: 'Amin khan',                  // Placeholder
    
    // Support
    supportEmail: 'help@nikahpakistan.com',  // Placeholder
    
    // WhatsApp Channel (Pesho X Intelligence / Nikah Pakistan)
    whatsappChannelLink: 'https://whatsapp.com/channel/0029VbCVtrP6WaKfh6ml7q3e', // Placeholder
    
    // Matchmaking & Filters
    defaultAgeRange: 5,                      // ±5 years for default filtering
    minMatchPercentage: 60,                  // Smart matching threshold
    
    // Features Toggle
    enableEmailVerification: true,
    enablePhoneAuth: false,                  // Future – phone OTP
    photoModeration: true,                   // Admin approves photos
    
    // Pre-seeded Data
    preloadedCardsCount: 150,               // Number of dummy proposal cards
    
    // Currency
    currencySymbol: '₨'
};

// ---------- 2. HELPER FUNCTIONS ----------

/**
 * Formats a number as Pakistani Rupees.
 * @param {number} amount - The amount to format.
 * @returns {string} Formatted currency string (e.g., "₨ 50,000").
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return `${NIKAH_CONFIG.currencySymbol} 0`;
    const num = Number(amount);
    if (isNaN(num)) return `${NIKAH_CONFIG.currencySymbol} 0`;
    return `${NIKAH_CONFIG.currencySymbol} ${num.toLocaleString('en-PK')}`;
}

/**
 * Returns the opposite gender.
 * @param {string} gender - 'Male' or 'Female'.
 * @returns {string} Opposite gender, or empty string if invalid.
 */
function getOppositeGender(gender) {
    if (gender === 'Male') return 'Female';
    if (gender === 'Female') return 'Male';
    return '';
}

/**
 * Calculates default age range based on a given age.
 * @param {number} age - The user's age.
 * @returns {{min: number, max: number}} Min and max ages (clamped to 18-100).
 */
function getDefaultAgeRange(age) {
    const range = NIKAH_CONFIG.defaultAgeRange;
    const min = Math.max(18, age - range);
    const max = age + range;
    return { min, max };
}

/**
 * Updates the footer across the site with values from NIKAH_CONFIG.
 * Looks for elements with specific data attributes or classes.
 * This function is called automatically on DOMContentLoaded.
 */
function updateGlobalFooter() {
    // Update site name in footer (elements with class 'js-site-name')
    document.querySelectorAll('.js-site-name').forEach(el => {
        el.textContent = NIKAH_CONFIG.siteName;
    });
    
    // Update Urdu site name
    document.querySelectorAll('.js-site-urdu-name').forEach(el => {
        el.textContent = NIKAH_CONFIG.siteUrduName;
    });
    
    // Update contact/WhatsApp info (elements with class 'js-footer-contact')
    document.querySelectorAll('.js-footer-contact').forEach(el => {
        if (el.tagName === 'A') {
            el.href = `https://wa.me/${NIKAH_CONFIG.adminWhatsApp}`;
            el.textContent = `WhatsApp: +${NIKAH_CONFIG.adminWhatsApp}`;
        } else {
            el.textContent = `+${NIKAH_CONFIG.adminWhatsApp}`;
        }
    });
    
    // Update support email
    document.querySelectorAll('.js-support-email').forEach(el => {
        if (el.tagName === 'A') {
            el.href = `mailto:${NIKAH_CONFIG.supportEmail}`;
        }
        el.textContent = NIKAH_CONFIG.supportEmail;
    });
    
    // Update copyright year dynamically
    document.querySelectorAll('.js-current-year').forEach(el => {
        el.textContent = new Date().getFullYear();
    });
    
    // Update WhatsApp Channel link
    document.querySelectorAll('.js-whatsapp-channel-link').forEach(el => {
        if (el.tagName === 'A') {
            el.href = NIKAH_CONFIG.whatsappChannelLink;
        }
    });
}

/**
 * Generates a WhatsApp link for direct admin contact.
 * @returns {string} The WhatsApp URL with a pre-filled message.
 */
function generateAdminWhatsAppLink() {
    const message = `*Assalam-o-Alaikum Admin Sahab,*%0A` +
                    `Main Nikah Pakistan website se raabta kar raha/rahi hoon.%0A` +
                    `Mujhe aap se madad chahiye.`;
    return `https://wa.me/${NIKAH_CONFIG.adminWhatsApp}?text=${message}`;
}

/**
 * Generates a WhatsApp link for expressing interest in a proposal.
 * @param {Object} cardData - The proposal card data (must have cardId, name, age, city, education, profession).
 * @param {Object} userData - The logged-in user's data (must have name, age, city, contact).
 * @returns {string} The WhatsApp URL with a pre-filled detailed message.
 */
function generateInterestWhatsAppLink(cardData, userData) {
    const message = `*Assalam-o-Alaikum Admin Sahab,*%0A%0A` +
                    `Main Nikah Pakistan website se raabta kar raha/rahi hoon.%0A` +
                    `Mujhe yeh rishta pasand aaya hai. Baraye meharbani mera proposal in tak pohnchayein.%0A%0A` +
                    `*Proposal Details:*%0A` +
                    `Proposal ID: *${cardData.cardId}*%0A` +
                    `Name: ${cardData.name}%0A` +
                    `Age: ${cardData.age}%0A` +
                    `City: ${cardData.city}%0A` +
                    `Education: ${cardData.education || 'Not specified'}%0A` +
                    `Profession: ${cardData.profession || 'Not specified'}%0A%0A` +
                    `*Meri Details:*%0A` +
                    `Name: ${userData.name}%0A` +
                    `Age: ${userData.age}%0A` +
                    `City: ${userData.city}%0A` +
                    `Contact: ${userData.contact}%0A%0A` +
                    `Main is rishte mein interested hoon. Aap mera yeh proposal unki taraf bhej dein.%0A%0A` +
                    `JazakAllah Khair.`;
    return `https://wa.me/${NIKAH_CONFIG.adminWhatsApp}?text=${message}`;
}

/**
 * Generic function to load an HTML component and inject it into a container.
 * @param {string} componentUrl - The relative path to the component HTML file.
 * @param {string|Element} container - The target element or its selector.
 * @returns {Promise<void>}
 */
async function loadComponent(componentUrl, container) {
    try {
        const response = await fetch(componentUrl);
        if (!response.ok) throw new Error(`Failed to load component: ${componentUrl}`);
        const html = await response.text();
        const target = typeof container === 'string' ? document.querySelector(container) : container;
        if (target) {
            target.insertAdjacentHTML('beforeend', html);
        }
    } catch (error) {
        console.error('Component loading error:', error);
    }
}

/**
 * Shows a toast notification (non-intrusive, auto-removed). No emojis.
 * @param {string} message - The message to display.
 * @param {string} type - 'success', 'error', 'info', 'warning'.
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message; // Clean text, no emoji
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: white;
        color: var(--color-text-dark);
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        font-weight: 500;
        border-left: 4px solid;
        border-color: ${type === 'success' ? 'var(--color-success)' : type === 'error' ? 'var(--color-error)' : type === 'warning' ? 'var(--color-warning)' : 'var(--color-info)'};
        animation: slideDown 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// ---------- 3. EXPOSE TO WINDOW ----------
window.NIKAH_CONFIG = NIKAH_CONFIG;
window.formatCurrency = formatCurrency;
window.getOppositeGender = getOppositeGender;
window.getDefaultAgeRange = getDefaultAgeRange;
window.updateGlobalFooter = updateGlobalFooter;
window.generateAdminWhatsAppLink = generateAdminWhatsAppLink;
window.generateInterestWhatsAppLink = generateInterestWhatsAppLink;
window.loadComponent = loadComponent;
window.showToast = showToast;

// ---------- 4. AUTO-RUN ON PAGE LOAD ----------
document.addEventListener('DOMContentLoaded', () => {
    updateGlobalFooter();
    console.log('Nikah Pakistan universal config loaded.'); // No emoji
});
