const { initializeApp } = require('firebase/app');
const { getDatabase } = require('firebase/database');

let db = null;

const initializeFirebase = () => {
  if (!db) {
    const firebaseConfig = {
      databaseURL: process.env.FIREBASE_DATABASE_URL
    };
    
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log('✅ Firebase connected to:', process.env.FIREBASE_DATABASE_URL);
  }
  return db;
};

module.exports = { initializeFirebase };
