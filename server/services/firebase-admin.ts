import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    // Check if we have a service account JSON
    try {
      // For production, you would use a service account file or env variable
      admin.initializeApp({
        // Using application default credentials for development
        // In production, you would set up a proper service account
        credential: admin.credential.applicationDefault(),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      });
      
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
      
      // Fallback to app-only initialization if credential fails
      admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      });
      
      console.log('Firebase Admin initialized with limited functionality');
    }
  }
  
  return admin;
}

// Initialize Firebase Admin
const firebaseAdmin = initializeFirebaseAdmin();

/**
 * Verify a Firebase ID token
 * @param idToken The Firebase ID token to verify
 * @returns The decoded token if valid, null otherwise
 */
async function verifyFirebaseToken(idToken: string) {
  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return null;
  }
}

/**
 * Get user by phone number
 * @param phoneNumber The phone number to look up
 * @returns The user if found, null otherwise
 */
async function getUserByPhoneNumber(phoneNumber: string) {
  try {
    const userRecord = await firebaseAdmin.auth().getUserByPhoneNumber(phoneNumber);
    return userRecord;
  } catch (error) {
    console.error('Error getting user by phone:', error);
    return null;
  }
}

export {
  firebaseAdmin,
  verifyFirebaseToken,
  getUserByPhoneNumber
};