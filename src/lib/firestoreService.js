/**
 * Thin Firestore CRUD helpers used by the Zustand store.
 * All writes are fire-and-forget (caller .catch(console.error) as needed).
 */
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';

/** Save (upsert) a document. Strips undefined values to avoid Firestore errors. */
export const saveDoc = (colName, id, data) => {
  const clean = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  return setDoc(doc(db, colName, id), clean, { merge: true });
};

/** Delete a document. */
export const removeDoc = (colName, id) => deleteDoc(doc(db, colName, id));

/** Fetch all documents in a collection (one-time read). */
export const loadCollection = async (colName) => {
  const snap = await getDocs(collection(db, colName));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
