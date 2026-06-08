import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const AuthContext = createContext(null);

const DEV = import.meta.env.DEV;

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [authError, setAuthError]     = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // ── setLoading(false) lives in finally – it ALWAYS runs ──
      try {
        if (firebaseUser) {
          if (DEV) console.log('[Auth] UID:', firebaseUser.uid);

          try {
            // ── Step 1: load (or create) the Firestore user profile ──
            const userRef = doc(db, 'users', firebaseUser.uid);
            let snap = await getDoc(userRef);

            if (!snap.exists()) {
              // First login – bootstrap the profile
              if (DEV) console.log('[Auth] First login – creating users/{uid} document');
              await setDoc(userRef, {
                uid:       firebaseUser.uid,
                email:     firebaseUser.email,
                name:      firebaseUser.displayName || firebaseUser.email,
                role:      'owner',
                isActive:  true,
                createdAt: serverTimestamp(),
              });
              // Re-read so we get the server-set fields
              snap = await getDoc(userRef);
            }

            const profile = snap.data() || {};

            if (DEV) {
              console.log('[Auth] Loaded user profile:', profile);
              console.log('[Auth] Role:', profile.role);
              console.log('[Auth] isActive:', profile.isActive);
            }

            // ── Step 2: validate isActive ──
            if (profile.isActive !== true) {
              setAuthError('هذا الحساب غير مفعّل. تواصل مع مدير النظام.');
              setUser(null);
              setUserProfile(null);
              // Sign out silently – the subsequent onAuthStateChanged(null)
              // call will NOT clear authError (see else branch below)
              await signOut(auth);
              return; // finally still runs → setLoading(false)
            }

            // ── Step 3: validate role ──
            if (profile.role !== 'owner') {
              setAuthError(
                `دورك الحالي (${profile.role || 'غير محدد'}) لا يملك صلاحية الوصول إلى هذا النظام.`
              );
              setUser(null);
              setUserProfile(null);
              await signOut(auth);
              return;
            }

            // ── Step 4: profile is valid – set state ──
            setUserProfile(profile);
            setUser({
              uid:      firebaseUser.uid,
              email:    firebaseUser.email,
              name:     profile.name || firebaseUser.displayName || firebaseUser.email,
              role:     profile.role,
              isActive: profile.isActive,
            });
            setAuthError(null);

          } catch (firestoreErr) {
            const code = firestoreErr?.code || '';
            console.error('[Auth] Firestore error:', code, firestoreErr.message);

            if (code === 'permission-denied') {
              setAuthError(
                'ليس لديك صلاحية للوصول إلى بيانات المستخدم. ' +
                'تحقق من Firestore Security Rules.'
              );
            } else if (code === 'unavailable') {
              setAuthError('تعذّر الاتصال بقاعدة البيانات. تحقق من الاتصال بالإنترنت.');
            } else {
              setAuthError('تعذّر تحميل بيانات الملف الشخصي. حاول تسجيل الخروج والدخول مجدداً.');
            }
            // Still provide basic auth identity so the error screen can show logout
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
            setUserProfile(null);
          }

        } else {
          // ── User signed out ──
          // authError is intentionally NOT cleared here:
          // if sign-out was triggered by a failed profile validation above,
          // the error must persist so the Login page can display it.
          // authError is cleared explicitly in logout() and on successful login.
          if (DEV) console.log('[Auth] Signed out');
          setUser(null);
          setUserProfile(null);
        }
      } catch (unexpected) {
        console.error('[Auth] Unexpected onAuthStateChanged error:', unexpected);
        setUser(null);
        setUserProfile(null);
        setAuthError('حدث خطأ غير متوقع في نظام المصادقة. حاول تحديث الصفحة.');
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  const login = async (email, password) => {
    setAuthError(null); // clear any previous error before new attempt
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    setAuthError(null);
    setUserProfile(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, authError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
