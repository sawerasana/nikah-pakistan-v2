/**
 * ============================================
 * NIKAH PAKISTAN V2 - FIREBASE SERVICES
 * Premium Matrimonial Platform
 * ============================================
 * This file contains ALL Firebase-related functions:
 * Authentication, Firestore CRUD, Storage,
 * Matching Algorithm, Dummy Data, and more.
 * 
 * Every function is async and includes proper error handling.
 * No emojis – completely professional.
 * ============================================
 */

'use strict';

// ---------- IMPORTS: CORE FIREBASE ----------
import { auth, db, storage } from './firebase-config.js';

// ---------- IMPORTS: FIREBASE SDK FUNCTIONS (CDN) ----------
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged,
    reload
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs,
    serverTimestamp,
    increment,
    writeBatch,
    addDoc,
    Timestamp,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ============================================
// SECTION 1: AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Registers a new user with email and password.
 * Creates a Firestore user document with initial profile data.
 * Sends email verification link.
 * @param {string} email - User's email address.
 * @param {string} password - User's password (min 6 characters).
 * @param {string} fullName - User's full name.
 * @param {string} gender - 'Male' or 'Female'.
 * @param {number} age - User's age (18+).
 * @returns {Promise<Object>} The created user credential.
 */
async function signUpUser(email, password, fullName, gender, age) {
    try {
        // Create authentication user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update display name
        await updateProfile(user, { displayName: fullName });

        // Create Firestore user document
        const userData = {
            uid: user.uid,
            email: email,
            name: fullName,
            gender: gender,
            age: age,
            createdAt: serverTimestamp(),
            lastLogin: null,
            emailVerified: false,
            isActive: true,
            isDummy: false,
            profileComplete: false,
            isVerified: false,
            photoURL: null,
            photoVisible: false,
            photoApproved: false,
            // Profile fields (empty initially)
            city: '',
            height: '',
            complexion: '',
            caste: '',
            tehsil: '',
            district: '',
            maslak: '',
            education: '',
            religiousEducation: '',
            profession: '',
            maritalStatus: '',
            previousMarriageDetails: '',
            childrenCount: 0,
            motherTongue: '',
            siblingsCount: 0,
            marriedSiblingsCount: 0,
            houseStatus: '',
            parentsAlive: '',
            monthlyIncome: '',
            marriageTimeline: '',
            demands: '',
            preferredCities: '',
            contactNumber: '',
            hobbies: '',
            jahezOrHaqMehr: '',
            // Preferences for matching
            prefAgeMin: Math.max(18, age - 5),
            prefAgeMax: age + 5,
            prefCity: '',
            prefMaslak: '',
            prefEducation: '',
            // Status flags
            profileCompletionPercentage: 10, // Basic info is 10%
            status: 'active',
            // Card ID
            cardId: generateCardId()
        };

        await setDoc(doc(db, "users", user.uid), userData);

        // Send email verification
        await sendEmailVerification(user);

        return { success: true, user, message: 'User registered successfully. Verification email sent.' };
    } catch (error) {
        console.error('Signup error:', error);
        return { success: false, error: getFirebaseErrorMessage(error) };
    }
}

/**
 * Logs in a user with email and password.
 * Checks if email is verified before allowing login.
 * @param {string} email - User's email.
 * @param {string} password - User's password.
 * @returns {Promise<Object>} The authenticated user or error.
 */
async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Reload to get latest emailVerified status
        await reload(user);

        // Check email verification
        if (NIKAH_CONFIG && NIKAH_CONFIG.enableEmailVerification && !user.emailVerified) {
            // Sign out if email not verified
            await signOut(auth);
            return {
                success: false,
                error: 'Please verify your email before logging in. Check your inbox.',
                needsVerification: true
            };
        }

        // Update lastLogin timestamp
        try {
            await updateDoc(doc(db, "users", user.uid), {
                lastLogin: serverTimestamp()
            });
        } catch (updateError) {
            console.warn('Could not update lastLogin:', updateError);
        }

        return { success: true, user };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: getFirebaseErrorMessage(error) };
    }
}

/**
 * Logs out the currently signed-in user.
 * @returns {Promise<Object>} Success status.
 */
async function logoutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sends email verification to the current user.
 * @param {Object} user - Firebase Auth user object.
 * @returns {Promise<Object>} Success status.
 */
async function sendVerificationEmail(user) {
    try {
        await sendEmailVerification(user);
        return { success: true, message: 'Verification email sent.' };
    } catch (error) {
        console.error('Send verification error:', error);
        return { success: false, error: getFirebaseErrorMessage(error) };
    }
}

/**
 * Checks if current user's email is verified.
 * Reloads user state first.
 * @returns {Promise<boolean>} True if email is verified.
 */
async function checkEmailVerification() {
    try {
        const user = auth.currentUser;
        if (!user) return false;
        await reload(user);
        return user.emailVerified;
    } catch (error) {
        console.error('Check verification error:', error);
        return false;
    }
}

/**
 * Sends a password reset email.
 * @param {string} email - User's email address.
 * @returns {Promise<Object>} Success status.
 */
async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: 'Password reset email sent. Check your inbox.' };
    } catch (error) {
        console.error('Reset password error:', error);
        return { success: false, error: getFirebaseErrorMessage(error) };
    }
}

/**
 * Returns the currently authenticated user.
 * @returns {Object|null} Firebase Auth user object or null.
 */
function getCurrentUser() {
    return auth.currentUser;
}

/**
 * Wrapper for onAuthStateChanged listener.
 * @param {Function} callback - Function to call when auth state changes.
 */
function onAuthStateChange(callback) {
    onAuthStateChanged(auth, callback);
}

// ============================================
// SECTION 2: FIRESTORE CRUD FUNCTIONS
// ============================================

/**
 * Fetches user data from Firestore by UID.
 * @param {string} uid - The user's Firebase UID.
 * @returns {Promise<Object|null>} User data object or null.
 */
async function getUserData(uid) {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { uid: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('Get user data error:', error);
        return null;
    }
}

/**
 * Updates a user's profile in Firestore.
 * Automatically calculates profile completion percentage.
 * @param {string} uid - User's Firebase UID.
 * @param {Object} data - The fields to update.
 * @returns {Promise<Object>} Success status.
 */
async function updateUserProfile(uid, data) {
    try {
        const userRef = doc(db, "users", uid);
        
        // Calculate profile completion percentage
        const completionPercentage = calculateProfileCompletion(data);
        
        await updateDoc(userRef, {
            ...data,
            profileCompletionPercentage: completionPercentage,
            profileComplete: completionPercentage >= 100,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Update profile error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Calculates profile completion percentage based on filled fields.
 * @param {Object} data - The profile data.
 * @returns {number} Percentage (0-100).
 */
function calculateProfileCompletion(data) {
    const keyFields = [
        'city', 'education', 'profession', 'maritalStatus', 'height',
        'motherTongue', 'houseStatus', 'monthlyIncome', 'contactNumber',
        'demands', 'preferredCities', 'religiousEducation'
    ];
    const filled = keyFields.filter(field => data[field] && data[field] !== '');
    const basePercent = 10; // Basic info already filled
    return Math.min(100, basePercent + Math.round((filled.length / keyFields.length) * 90));
}

/**
 * Generates a unique card ID.
 * @returns {string} Card ID in format NKH-XXXXXX.
 */
function generateCardId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'NKH-';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Fetches all active proposals with pagination.
 * @param {number} limitCount - Number of proposals per page.
 * @param {Object} lastVisible - Last document from previous page.
 * @returns {Promise<Object>} { proposals: Array, lastVisible: DocumentSnapshot }.
 */
async function getAllActiveProposals(limitCount = 50, lastVisible = null) {
    try {
        let q = query(
            collection(db, "users"),
            where("isActive", "==", true),
            where("status", "==", "active"),
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );

        if (lastVisible) {
            q = query(q, startAfter(lastVisible));
        }

        const snapshot = await getDocs(q);
        const proposals = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Remove sensitive fields from public view
            const { contactNumber, email, ...publicData } = data;
            proposals.push({ uid: doc.id, ...publicData });
        });

        const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
        return { proposals, lastVisible: newLastVisible };
    } catch (error) {
        console.error('Get proposals error:', error);
        // Check if composite index is missing
        if (error.code === 'failed-precondition') {
            console.warn('Firestore index required. Please create the index via the link in the error message.');
        }
        return { proposals: [], lastVisible: null };
    }
}

/**
 * Fetches proposals with filters applied.
 * Note: Firestore has limitations on range queries across multiple fields.
 * Some filtering is done client-side for simplicity.
 * @param {Object} filters - Filter criteria { gender, ageMin, ageMax, city, education, maritalStatus }.
 * @param {number} limitCount - Max results.
 * @returns {Promise<Array>} Filtered proposals.
 */
async function getProposalsByFilters(filters = {}, limitCount = 50) {
    try {
        // Start with base query
        const conditions = [
            where("isActive", "==", true),
            where("status", "==", "active")
        ];

        if (filters.gender) {
            conditions.push(where("gender", "==", filters.gender));
        }

        let q = query(
            collection(db, "users"),
            ...conditions,
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        let proposals = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const { contactNumber, email, ...publicData } = data;
            proposals.push({ uid: doc.id, ...publicData });
        });

        // Client-side filtering for age, city, education
        if (filters.ageMin) {
            proposals = proposals.filter(p => p.age >= parseInt(filters.ageMin));
        }
        if (filters.ageMax) {
            proposals = proposals.filter(p => p.age <= parseInt(filters.ageMax));
        }
        if (filters.city) {
            const cityLower = filters.city.toLowerCase();
            proposals = proposals.filter(p => p.city && p.city.toLowerCase().includes(cityLower));
        }
        if (filters.education) {
            const eduLower = filters.education.toLowerCase();
            proposals = proposals.filter(p => p.education && p.education.toLowerCase().includes(eduLower));
        }
        if (filters.maritalStatus) {
            proposals = proposals.filter(p => p.maritalStatus === filters.maritalStatus);
        }

        return proposals;
    } catch (error) {
        console.error('Filter proposals error:', error);
        return [];
    }
}

/**
 * Fetches full proposal details by UID.
 * @param {string} uid - The proposal owner's UID.
 * @returns {Promise<Object|null>} Proposal data or null.
 */
async function getProposalDetail(uid) {
    try {
        const userData = await getUserData(uid);
        if (userData) {
            // Remove sensitive fields
            const { contactNumber, email, ...publicData } = userData;
            return publicData;
        }
        return null;
    } catch (error) {
        console.error('Get proposal detail error:', error);
        return null;
    }
}

/**
 * Records an interest (when a user clicks "Interested" on a proposal).
 * @param {string} interestedUserId - The interested user's UID.
 * @param {Object} interestedUserData - { name, age, city, contact }.
 * @param {string} proposalId - The proposal's card ID.
 * @param {string} proposalOwnerUid - The proposal owner's UID.
 * @returns {Promise<Object>} Success status.
 */
async function recordInterest(interestedUserId, interestedUserData, proposalId, proposalOwnerUid) {
    try {
        const interestData = {
            interestedUserId,
            interestedUserName: interestedUserData.name,
            interestedUserAge: interestedUserData.age,
            interestedUserCity: interestedUserData.city,
            interestedUserContact: interestedUserData.contact,
            proposalId,
            proposalOwnerUid,
            timestamp: serverTimestamp(),
            status: 'pending',
            isNotified: false
        };

        await addDoc(collection(db, "interests"), interestData);
        return { success: true, message: 'Interest recorded. Admin will contact you.' };
    } catch (error) {
        console.error('Record interest error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetches all interests for a specific proposal owner.
 * @param {string} ownerUid - The proposal owner's UID.
 * @returns {Promise<Array>} List of interests.
 */
async function getInterestsForProposalOwner(ownerUid) {
    try {
        const q = query(
            collection(db, "interests"),
            where("proposalOwnerUid", "==", ownerUid),
            orderBy("timestamp", "desc")
        );
        const snapshot = await getDocs(q);
        const interests = [];
        snapshot.forEach(doc => {
            interests.push({ id: doc.id, ...doc.data() });
        });
        return interests;
    } catch (error) {
        console.error('Get interests error:', error);
        return [];
    }
}

// ============================================
// SECTION 3: STORAGE FUNCTIONS
// ============================================

/**
 * Uploads a profile photo to Firebase Storage.
 * Updates the user's Firestore document with the photo URL.
 * Sets photoApproved to false if moderation is enabled.
 * @param {string} uid - User's UID.
 * @param {File} file - The image file to upload.
 * @returns {Promise<Object>} { success, photoURL }.
 */
async function uploadProfilePhoto(uid, file) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const storageRef = ref(storage, `profile_pictures/${uid}/${fileName}`);

        // Upload file
        const uploadResult = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        // Update user document
        const updateData = {
            photoURL: downloadURL,
            photoApproved: !NIKAH_CONFIG.photoModeration, // Auto-approve if moderation disabled
            updatedAt: serverTimestamp()
        };
        await updateDoc(doc(db, "users", uid), updateData);

        return { success: true, photoURL: downloadURL };
    } catch (error) {
        console.error('Upload photo error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Deletes a previously uploaded photo from Storage.
 * @param {string} photoURL - The full URL of the photo to delete.
 * @returns {Promise<Object>} Success status.
 */
async function deleteProfilePhoto(photoURL) {
    try {
        const photoRef = ref(storage, photoURL);
        await deleteObject(photoRef);
        return { success: true };
    } catch (error) {
        console.error('Delete photo error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// SECTION 4: MATCHING ALGORITHM
// ============================================

/**
 * Runs the smart matching algorithm for a user.
 * Compares user preferences against all active opposite-gender proposals.
 * Stores results in the matches collection.
 * @param {string} uid - The user's Firebase UID.
 * @returns {Promise<Object>} { success, matches, count }.
 */
async function runMatchingAlgorithm(uid) {
    try {
        const userData = await getUserData(uid);
        if (!userData) return { success: false, error: 'User not found' };

        const oppositeGender = getOppositeGender(userData.gender);
        const minScore = NIKAH_CONFIG.minMatchPercentage || 60;

        // Fetch all active opposite gender proposals
        const { proposals } = await getAllActiveProposals(200);

        const matches = [];
        for (const proposal of proposals) {
            // Skip own profile
            if (proposal.uid === uid) continue;
            // Skip same gender
            if (proposal.gender !== oppositeGender) continue;

            const { score, reasons } = calculateMatchScore(userData, proposal);
            if (score >= minScore) {
                matches.push({
                    userId: uid,
                    proposalId: proposal.cardId,
                    proposalOwnerUid: proposal.uid,
                    proposalName: proposal.name,
                    proposalAge: proposal.age,
                    proposalCity: proposal.city,
                    proposalEducation: proposal.education,
                    matchScore: score,
                    matchReasons: reasons,
                    isNotified: false,
                    createdAt: serverTimestamp()
                });
            }
        }

        // Store matches in Firestore
        const batch = writeBatch(db);
        const matchesCollection = collection(db, "matches", uid, "user_matches");
        
        for (const match of matches) {
            const docRef = doc(matchesCollection);
            batch.set(docRef, match);
        }
        await batch.commit();

        return { success: true, matches, count: matches.length };
    } catch (error) {
        console.error('Matching algorithm error:', error);
        return { success: false, error: error.message, matches: [], count: 0 };
    }
}

/**
 * Calculates a match score between a user and a proposal.
 * @param {Object} user - The user's profile.
 * @param {Object} proposal - The proposal to compare.
 * @returns {Object} { score, reasons }.
 */
function calculateMatchScore(user, proposal) {
    let score = 0;
    const reasons = [];

    // City match (35 points)
    const userPreferredCity = user.prefCity || user.city;
    const proposalCity = proposal.city;
    if (userPreferredCity && proposalCity && userPreferredCity.toLowerCase() === proposalCity.toLowerCase()) {
        score += 35;
        reasons.push({ type: 'city', matched: true, text: `Same city: ${proposalCity}` });
    } else if (userPreferredCity && proposalCity) {
        reasons.push({ type: 'city', matched: false, text: `City: ${proposalCity} (your preference: ${userPreferredCity})` });
    }

    // Age range (25 points)
    const userMinAge = user.prefAgeMin || (user.age - 5);
    const userMaxAge = user.prefAgeMax || (user.age + 5);
    if (proposal.age >= userMinAge && proposal.age <= userMaxAge) {
        score += 25;
        reasons.push({ type: 'age', matched: true, text: `Age: ${proposal.age} - within your range ${userMinAge}-${userMaxAge}` });
    } else {
        reasons.push({ type: 'age', matched: false, text: `Age: ${proposal.age} - outside your range ${userMinAge}-${userMaxAge}` });
    }

    // Maslak match (20 points)
    const userMaslak = user.prefMaslak || user.maslak;
    const proposalMaslak = proposal.maslak;
    if (userMaslak && proposalMaslak && userMaslak.toLowerCase() === proposalMaslak.toLowerCase()) {
        score += 20;
        reasons.push({ type: 'maslak', matched: true, text: `Same maslak: ${proposalMaslak}` });
    } else if (userMaslak && proposalMaslak) {
        reasons.push({ type: 'maslak', matched: false, text: `Maslak: ${proposalMaslak} (yours: ${userMaslak})` });
    }

    // Education level (15 points)
    const userEdu = user.prefEducation || user.education;
    const proposalEdu = proposal.education;
    if (userEdu && proposalEdu) {
        if (userEdu.toLowerCase() === proposalEdu.toLowerCase() || isEducationHigher(proposalEdu, userEdu)) {
            score += 15;
            reasons.push({ type: 'education', matched: true, text: `Education: ${proposalEdu}` });
        } else {
            reasons.push({ type: 'education', matched: false, text: `Education: ${proposalEdu} (you prefer: ${userEdu})` });
        }
    }

    // Mother tongue match (5 points)
    const userLang = user.motherTongue;
    const proposalLang = proposal.motherTongue;
    if (userLang && proposalLang && userLang.toLowerCase() === proposalLang.toLowerCase()) {
        score += 5;
        reasons.push({ type: 'language', matched: true, text: `Same language: ${proposalLang}` });
    }

    // Verified bonus (5 points)
    if (proposal.isVerified) {
        score += 5;
        reasons.push({ type: 'verified', matched: true, text: 'Verified profile' });
    }

    return { score: Math.min(100, score), reasons };
}

/**
 * Checks if an education level is higher than or equal to another.
 * @param {string} edu1 - First education level.
 * @param {string} edu2 - Second education level.
 * @returns {boolean} True if edu1 >= edu2.
 */
function isEducationHigher(edu1, edu2) {
    const levels = ['matric', 'fsc', 'fa', 'bachelors', 'ba', 'bsc', 'bcom', 'masters', 'ma', 'msc', 'mcom', 'mba', 'mphil', 'phd'];
    const idx1 = levels.findIndex(l => edu1.toLowerCase().includes(l));
    const idx2 = levels.findIndex(l => edu2.toLowerCase().includes(l));
    if (idx1 === -1 || idx2 === -1) return false;
    return idx1 >= idx2;
}

/**
 * Fetches stored matches for a user.
 * @param {string} uid - User's UID.
 * @param {number} limitCount - Max matches to return.
 * @returns {Promise<Array>} Sorted matches.
 */
async function getUserMatches(uid, limitCount = 20) {
    try {
        const q = query(
            collection(db, "matches", uid, "user_matches"),
            orderBy("matchScore", "desc"),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        const matches = [];
        snapshot.forEach(doc => {
            matches.push({ id: doc.id, ...doc.data() });
        });
        return matches;
    } catch (error) {
        console.error('Get matches error:', error);
        return [];
    }
}

/**
 * Marks a match as notified.
 * @param {string} uid - User's UID.
 * @param {string} matchId - Match document ID.
 * @returns {Promise<Object>} Success status.
 */
async function markMatchNotified(uid, matchId) {
    try {
        await updateDoc(doc(db, "matches", uid, "user_matches", matchId), {
            isNotified: true
        });
        return { success: true };
    } catch (error) {
        console.error('Mark match notified error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// SECTION 5: DUMMY DATA SEEDING
// ============================================

/**
 * Seeds the database with dummy proposal cards.
 * Uses random Pakistani names, cities, and realistic data.
 * @param {number} count - Number of dummy proposals to create.
 * @returns {Promise<Object>} { success, createdCount }.
 */
async function seedDummyProposals(count = 150) {
    try {
        const maleNames = [
            'Ahmed', 'Bilal', 'Danish', 'Fahad', 'Hassan', 'Imran', 'Kamran', 'Mansoor',
            'Nabeel', 'Omar', 'Rashid', 'Saad', 'Tariq', 'Usman', 'Waqas', 'Zain',
            'Farhan', 'Hamza', 'Ibrahim', 'Junaid', 'Kashif', 'Luqman', 'Muneeb', 'Nasir',
            'Qasim', 'Rizwan', 'Shahid', 'Talha', 'Umair', 'Waleed', 'Yasir', 'Zubair'
        ];
        const femaleNames = [
            'Ayesha', 'Bushra', 'Fatima', 'Hira', 'Khadeeja', 'Maryam', 'Noor', 'Sara',
            'Zainab', 'Amina', 'Bisma', 'Dua', 'Eman', 'Farah', 'Gul', 'Hina',
            'Iqra', 'Javeria', 'Kainat', 'Laiba', 'Mahnoor', 'Nadia', 'Parveen', 'Rabia',
            'Saima', 'Tahira', 'Urooj', 'Warda', 'Yusra', 'Zoya', 'Sania', 'Mehwish'
        ];
        const cities = [
            'Lahore', 'Karachi', 'Islamabad', 'Peshawar', 'Quetta', 'Multan',
            'Faisalabad', 'Rawalpindi', 'Sialkot', 'Gujranwala', 'Hyderabad',
            'Bahawalpur', 'Gujrat', 'Sargodha', 'Sukkur', 'Mardan', 'Abbottabad', 'Swat'
        ];
        const educations = ['Matric', 'FSc', 'BSc', 'BA', 'BCom', 'BBA', 'MBA', 'MA', 'MSc', 'MPhil', 'MBBS', 'BDS', 'LLB'];
        const professions = ['Teacher', 'Doctor', 'Engineer', 'Banker', 'Businessman', 'Lawyer', 'Pharmacist', 'Lecturer', 'Accountant', 'IT Professional', 'Army Officer', 'Civil Servant'];
        const maslaks = ['Sunni Hanafi', 'Sunni Shafi', 'Sunni Maliki', 'Sunni Hanbali', 'Shia Ithna Ashari', 'Shia Ismaili'];
        const motherTongues = ['Urdu', 'Punjabi', 'Sindhi', 'Pashto', 'Balochi', 'Saraiki', 'Hindko'];
        const maritalStatuses = ['Never Married', 'Never Married', 'Never Married', 'Never Married', 'Divorced', 'Widowed'];
        const houseStatuses = ['Own', 'Rent', 'Apartment', 'Own', 'Own'];
        const parentsOptions = ['Both', 'Only Father', 'Only Mother', 'Both', 'Both'];

        const batch = writeBatch(db);
        let createdCount = 0;

        for (let i = 0; i < count; i++) {
            const isMale = i % 2 === 0;
            const nameList = isMale ? maleNames : femaleNames;
            const name = nameList[Math.floor(Math.random() * nameList.length)];
            const gender = isMale ? 'Male' : 'Female';
            const age = 18 + Math.floor(Math.random() * 18);
            const city = cities[Math.floor(Math.random() * cities.length)];
            const education = educations[Math.floor(Math.random() * educations.length)];
            const profession = professions[Math.floor(Math.random() * professions.length)];
            const maslak = maslaks[Math.floor(Math.random() * maslaks.length)];
            const motherTongue = motherTongues[Math.floor(Math.random() * motherTongues.length)];
            const maritalStatus = maritalStatuses[Math.floor(Math.random() * maritalStatuses.length)];
            const houseStatus = houseStatuses[Math.floor(Math.random() * houseStatuses.length)];
            const parentsAlive = parentsOptions[Math.floor(Math.random() * parentsOptions.length)];
            const monthlyIncome = `${20000 + Math.floor(Math.random() * 130000)}-${40000 + Math.floor(Math.random() * 160000)} PKR`;
            const cardId = generateCardId();
            const uid = `dummy_${cardId}_${Date.now()}_${i}`;

            const dummyData = {
                uid: uid,
                name: name,
                gender: gender,
                age: age,
                city: city,
                tehsil: city,
                district: city,
                education: education,
                profession: profession,
                maslak: maslak,
                motherTongue: motherTongue,
                maritalStatus: maritalStatus,
                houseStatus: houseStatus,
                parentsAlive: parentsAlive,
                monthlyIncome: monthlyIncome,
                height: `${5 + Math.floor(Math.random() * 2)}'${Math.floor(Math.random() * 11)}"`,
                complexion: ['Fair', 'Wheatish', 'Brown'][Math.floor(Math.random() * 3)],
                caste: ['Rajput', 'Arain', 'Mughal', 'Jutt', 'Sheikh', 'Syed'][Math.floor(Math.random() * 6)],
                religiousEducation: ['Hafiz', 'Aalim', 'General', 'General', 'Nazra'][Math.floor(Math.random() * 5)],
                siblingsCount: Math.floor(Math.random() * 8),
                marriedSiblingsCount: Math.floor(Math.random() * 3),
                childrenCount: maritalStatus === 'Divorced' || maritalStatus === 'Widowed' ? Math.floor(Math.random() * 4) : 0,
                marriageTimeline: ['Within 3 months', 'Within 6 months', 'Within 1 year'][Math.floor(Math.random() * 3)],
                demands: '',
                preferredCities: '',
                contactNumber: '',
                email: '',
                isActive: true,
                isDummy: true,
                profileComplete: true,
                photoURL: null,
                photoVisible: false,
                photoApproved: false,
                isVerified: Math.random() > 0.7,
                status: 'active',
                cardId: cardId,
                profileCompletionPercentage: 85 + Math.floor(Math.random() * 15),
                createdAt: Timestamp.fromDate(new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000))),
                prefAgeMin: Math.max(18, age - 5),
                prefAgeMax: age + 5,
                prefCity: '',
                prefMaslak: '',
                prefEducation: ''
            };

            batch.set(doc(db, "users", uid), dummyData);
            createdCount++;
        }

        await batch.commit();
        console.log(`${createdCount} dummy proposals seeded successfully.`);
        return { success: true, createdCount };
    } catch (error) {
        console.error('Seed dummy data error:', error);
        return { success: false, error: error.message, createdCount: 0 };
    }
                      }

// ============================================
// SECTION 6: SUCCESS STORIES
// ============================================

/**
 * Fetches proposals marked as "Married" for the success stories page.
 * @param {number} limitCount - Max stories to fetch.
 * @returns {Promise<Array>} Array of success stories.
 */
async function getSuccessStories(limitCount = 20) {
    try {
        const q = query(
            collection(db, "users"),
            where("status", "==", "married"),
            orderBy("updatedAt", "desc"),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        const stories = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            stories.push({
                uid: doc.id,
                name: data.name,
                city: data.city,
                marriageDate: data.marriageDate || null,
                cardId: data.cardId
            });
        });
        return stories;
    } catch (error) {
        console.error('Get success stories error:', error);
        return [];
    }
}

// ============================================
// SECTION 7: HELPER FUNCTIONS
// ============================================

/**
 * Converts Firebase auth errors into user-friendly messages.
 * @param {Object} error - Firebase auth error object.
 * @returns {string} User-friendly error message.
 */
function getFirebaseErrorMessage(error) {
    if (!error || !error.code) return 'An unknown error occurred. Please try again.';
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please login instead.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/user-disabled':
            return 'This account has been disabled. Contact admin for help.';
        case 'auth/user-not-found':
            return 'No account found with this email. Please sign up first.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection.';
        case 'auth/operation-not-allowed':
            return 'This sign-in method is not enabled. Contact admin.';
        default:
            return error.message || 'An error occurred. Please try again.';
    }
}

// ============================================
// SECTION 8: EXPOSE FUNCTIONS GLOBALLY
// ============================================

// Authentication
window.signUpUser = signUpUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.sendVerificationEmail = sendVerificationEmail;
window.checkEmailVerification = checkEmailVerification;
window.resetPassword = resetPassword;
window.getCurrentUser = getCurrentUser;
window.onAuthStateChange = onAuthStateChange;

// Firestore CRUD
window.getUserData = getUserData;
window.updateUserProfile = updateUserProfile;
window.getAllActiveProposals = getAllActiveProposals;
window.getProposalsByFilters = getProposalsByFilters;
window.getProposalDetail = getProposalDetail;
window.recordInterest = recordInterest;
window.getInterestsForProposalOwner = getInterestsForProposalOwner;

// Storage
window.uploadProfilePhoto = uploadProfilePhoto;
window.deleteProfilePhoto = deleteProfilePhoto;

// Matching
window.runMatchingAlgorithm = runMatchingAlgorithm;
window.getUserMatches = getUserMatches;
window.markMatchNotified = markMatchNotified;

// Dummy Data
window.seedDummyProposals = seedDummyProposals;

// Success Stories
window.getSuccessStories = getSuccessStories;

// Helpers
window.getFirebaseErrorMessage = getFirebaseErrorMessage;
window.generateCardId = generateCardId;
window.calculateProfileCompletion = calculateProfileCompletion;

// ---------- NAMED EXPORTS ----------
export {
    signUpUser, loginUser, logoutUser, sendVerificationEmail, checkEmailVerification,
    resetPassword, getCurrentUser, onAuthStateChange,
    getUserData, updateUserProfile, getAllActiveProposals, getProposalsByFilters,
    getProposalDetail, recordInterest, getInterestsForProposalOwner,
    uploadProfilePhoto, deleteProfilePhoto,
    runMatchingAlgorithm, getUserMatches, markMatchNotified,
    seedDummyProposals, getSuccessStories,
    getFirebaseErrorMessage, generateCardId, calculateProfileCompletion
};
```
        
