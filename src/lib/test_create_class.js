const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, serverTimestamp, setDoc, doc, initializeFirestore } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBG2ypv1IDlQVTDSr90LqSVGpZSAIUdPeI",
  authDomain: "campus-connect-6dbbd.firebaseapp.com",
  projectId: "campus-connect-6dbbd",
  storageBucket: "campus-connect-6dbbd.firebasestorage.app",
  messagingSenderId: "723326799459",
  appId: "1:723326799459:web:9525543f5344e9a14c7256"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let db;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true
  });
} catch {
  db = getFirestore(app);
}

// Simple mock code for generating class code
function generateClassCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function run() {
  const email = `test_prof_${Date.now()}@example.com`;
  const password = "password123";
  const name = "Test Professor";
  const role = "professor";

  console.log("1. Creating test professor account...");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    console.log(`- Created Auth user: ${uid}`);

    // Create user profile in firestore
    const profile = {
      uid,
      name,
      email,
      role,
      joinedClasses: [],
      createdAt: new Date().toISOString()
    };
    console.log("2. Saving professor profile to Firestore 'users' collection...");
    await setDoc(doc(db, 'users', uid), profile);
    console.log("- Profile saved successfully!");

    // Now try to create a class
    console.log("3. Attempting to create a class in 'classes' collection...");
    const classData = {
      subject: "DSA",
      department: "IT",
      college: "ICEM",
      year: "Second Year",
      division: "C",
      semester: "Semester 3",
      name: "C - DSA",
      professorId: uid,
      professorName: name,
      joinCode: generateClassCode(),
      students: [],
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'classes'), classData);
    console.log(`- Success! Created class with ID: ${docRef.id}`);

  } catch (err) {
    console.error("❌ FAILED WITH ERROR:", err);
  }
  process.exit(0);
}

run();
