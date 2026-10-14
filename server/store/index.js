const e = process.env;
const useFirebase = Boolean(
  e.FIREBASE_SERVICE_ACCOUNT ||
    (e.FIREBASE_PROJECT_ID && e.FIREBASE_CLIENT_EMAIL && e.FIREBASE_PRIVATE_KEY) ||
    e.GOOGLE_APPLICATION_CREDENTIALS ||
    e.K_SERVICE // running on Cloud Run
);

module.exports = useFirebase ? require('./firestoreStore') : require('./fileStore');
