import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
  limit,
  increment,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// 1. Initialize Firebase App, Firestore, Auth & Storage
const app = initializeApp(firebaseConfig);
const databaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// 2. Google Workspace OAuth Scopes (Keep, Drive, Contacts, Gmail, Tasks)
export const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
];

export const baseGoogleProvider = new GoogleAuthProvider();
baseGoogleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const workspaceGoogleProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  workspaceGoogleProvider.addScope(scope);
});
workspaceGoogleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const getSafeUid = (uid: string): string =>
  uid.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);

export const getChatId = (uidA: string, uidB: string): string =>
  [getSafeUid(uidA), getSafeUid(uidB)].sort().join('_').slice(0, 128);

// 3. Validate Connection to Firestore & Diagnostics
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (err: any) {
    // Permission error still confirms live reachability to Firestore backend
    return err?.code === 'permission-denied';
  }
}
testConnection();

export function getFirebaseDiagnostics() {
  const cfg = firebaseConfig as {
    projectId?: string;
    firestoreDatabaseId?: string;
    storageBucket?: string;
    authDomain?: string;
  };
  return {
    projectId: cfg.projectId || '',
    databaseId: cfg.firestoreDatabaseId || '(default)',
    storageBucket: cfg.storageBucket || '',
    authDomain: cfg.authDomain || '',
    uid: auth.currentUser?.uid || null,
    email: auth.currentUser?.email || null,
    isAuthenticated: Boolean(auth.currentUser),
  };
}

// 4. Standardized Firestore Error Handler
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    uid: string | null;
    email: string | null;
    isAnonymous: boolean;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const err = error as { code?: string; message?: string };
  const info: FirestoreErrorInfo = {
    error: err.message || String(error),
    operationType,
    path,
    authInfo: {
      uid: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      isAnonymous: auth.currentUser?.isAnonymous || false,
    },
  };
  console.warn(`Firestore Permission Notice: ${operationType} on ${path}:`, info.error);
  throw new Error(JSON.stringify(info));
}

// 5. Authentication & Token Management
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string | null) => void,
  onAuthFailure?: () => void,
) => {
  getRedirectResult(auth)
    .then(async (result) => {
      if (result?.user) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        cachedAccessToken = credential?.accessToken || null;
        await syncFirebaseUserProfile(result.user);
        if (onAuthSuccess) onAuthSuccess(result.user, cachedAccessToken);
      }
    })
    .catch((err) => {
      console.warn('Redirect auth result warning:', err);
    });

  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const getFirebaseIdToken = async (): Promise<string | null> => {
  if (!auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch (error) {
    console.error('Failed to get Firebase ID token:', error);
    return null;
  }
};

export interface SyncUserProfileOptions {
  name?: string;
  nameBn?: string;
  avatar?: string;
  bio?: string;
  city?: string;
  isOnline?: boolean;
}

export const syncFirebaseUserProfile = async (
  user: FirebaseUser,
  options?: string | SyncUserProfileOptions,
) => {
  const opts: SyncUserProfileOptions =
    typeof options === 'string' ? { nameBn: options } : options || {};
  const safeUid = getSafeUid(user.uid);
  const publicRef = doc(db, 'users', safeUid);
  const privatePath = `users/${safeUid}/private/info`;

  let existingData: Record<string, any> | null = null;
  try {
    const snap = await getDoc(publicRef);
    if (snap.exists()) {
      existingData = snap.data();
    }
  } catch {
    // Proceed cleanly if offline/first write
  }

  const cleanName = (opts.name || existingData?.name || user.displayName || 'Bandhan Member').slice(
    0,
    120,
  );
  const cleanUsername = (
    existingData?.username ||
    user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_.-]/g, '_') ||
    `user_${safeUid.slice(0, 8)}`
  ).slice(0, 80);

  const candidateAvatar =
    opts.avatar ||
    existingData?.avatar ||
    user.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0284c7&color=fff`;
  const cleanAvatar = (
    candidateAvatar.length <= 2048 || candidateAvatar.startsWith('data:image/')
      ? candidateAvatar.slice(0, 650000)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0284c7&color=fff`
  );

  const payload: Record<string, unknown> = {
    uid: safeUid,
    name: cleanName,
    nameBn: (opts.nameBn || existingData?.nameBn || cleanName).slice(0, 120),
    username: cleanUsername,
    avatar: cleanAvatar,
    bio: (opts.bio ?? existingData?.bio ?? 'Bandhan Member • Connected with Firebase Cloud').slice(
      0,
      500,
    ),
    city: (opts.city ?? existingData?.city ?? 'Dhaka, Bangladesh').slice(0, 120),
    isOnline: opts.isOnline ?? existingData?.isOnline ?? true,
    updatedAt: serverTimestamp(),
  };

  if (!existingData?.createdAt) {
    payload.createdAt = serverTimestamp();
  }

  try {
    await setDoc(publicRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Profile sync notice on users/${safeUid}:`, error);
  }

  if (user.email) {
    try {
      await setDoc(
        doc(db, 'users', safeUid, 'private', 'info'),
        {
          uid: safeUid,
          email: user.email.slice(0, 254),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      console.warn(`Private profile sync notice on ${privatePath}:`, error);
    }
  }
};

export const googleSignIn = async (
  useWorkspaceScopes = false,
): Promise<{
  user: FirebaseUser;
  accessToken: string;
} | null> => {
  const chosenProvider = useWorkspaceScopes ? workspaceGoogleProvider : baseGoogleProvider;
  try {
    const result = await signInWithPopup(auth, chosenProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;

    await syncFirebaseUserProfile(result.user);

    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: any) {
    console.error('Google Sign in popup error:', error);
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      try {
        await signInWithRedirect(auth, chosenProvider);
        return null;
      } catch (redirectErr) {
        console.error('Redirect sign in error:', redirectErr);
        throw redirectErr;
      }
    }
    let friendlyMessage = 'Google login failed. Please select your Google account.';
    if (error?.code === 'auth/popup-closed-by-user') {
      friendlyMessage = 'Sign-in window closed. Please click continue with Google again.';
    } else if (error?.code === 'auth/unauthorized-domain') {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      friendlyMessage = `Domain "${host}" is not authorized in Firebase Authentication. Add "${host}" under Firebase Console → Authentication → Settings → Authorized domains.`;
    } else if (error?.code === 'auth/operation-not-allowed') {
      friendlyMessage =
        'Google Sign-In is disabled in Firebase Console. Enable it under Authentication → Sign-in method.';
    } else if (error?.code === 'auth/network-request-failed') {
      friendlyMessage = 'Network error. Please check your internet connection.';
    } else if (error?.code === 'auth/account-exists-with-different-credential') {
      friendlyMessage = 'An account already exists with this email with a different login provider.';
    }
    const err = new Error(friendlyMessage);
    (err as any).code = error?.code;
    throw err;
  }
};

const mapFirebaseEmailAuthError = (error: any, fallback: string): Error => {
  const code = error?.code || '';
  let msg = fallback;
  if (code === 'auth/email-already-in-use') {
    msg = 'This email is already registered. Please log in instead.';
  } else if (code === 'auth/weak-password') {
    msg = 'Password is too weak. Please enter at least 6 characters.';
  } else if (code === 'auth/invalid-email') {
    msg = 'Please enter a valid email address.';
  } else if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    msg = 'Incorrect email or password. Please check your credentials.';
  } else if (code === 'auth/too-many-requests') {
    msg = 'Too many failed attempts. Please wait a moment before trying again.';
  } else if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
    msg = `Domain "${host}" is not authorized in Firebase Auth Authorized Domains.`;
  } else if (code === 'auth/operation-not-allowed') {
    msg = 'Email/Password sign-in is not enabled in Firebase Authentication settings.';
  }
  const err = new Error(msg);
  (err as any).code = code;
  return err;
};

export const firebaseRegisterWithEmailPassword = async (
  email: string,
  pass: string,
  displayName: string,
  nameBn?: string,
): Promise<FirebaseUser> => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }
    await syncFirebaseUserProfile(cred.user, { nameBn });
    return cred.user;
  } catch (error: any) {
    throw mapFirebaseEmailAuthError(error, 'Account creation failed. Please try again.');
  }
};

export const firebaseLoginWithEmailPassword = async (
  email: string,
  pass: string,
): Promise<FirebaseUser> => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    await syncFirebaseUserProfile(cred.user);
    return cred.user;
  } catch (error: any) {
    throw mapFirebaseEmailAuthError(error, 'Email login failed. Please check your credentials.');
  }
};

export const firebaseSendPasswordResetEmail = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error: any) {
    throw mapFirebaseEmailAuthError(error, 'Failed to send password reset email.');
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const firebaseLogout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// 6. Media Helpers & Firebase Storage
export const isCloudPlayableUrl = (url?: string | null): url is string => {
  if (!url) return false;
  if (/^https?:\/\//i.test(url)) return true;
  if (url.startsWith('data:')) {
    return url.length < 700_000;
  }
  return false;
};

export const uploadMediaToFirebaseStorage = async (
  file: File | Blob,
  onProgress?: (percent: number) => void,
): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Firebase authentication required for Storage upload');
  }
  const safeUid = getSafeUid(user.uid);
  const rawName = (file as File).name || `media_${Date.now()}.mp4`;
  const cleanName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-64);
  const storageRef = ref(storage, `users/${safeUid}/${Date.now()}_${cleanName}`);

  return await new Promise<string>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const pct = Math.min(
            99,
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          );
          onProgress(pct);
        }
      },
      (err) => reject(err),
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (onProgress) onProgress(100);
          resolve(downloadUrl);
        } catch (err) {
          reject(err);
        }
      },
    );
  });
};

// 7. Cloud Posts & Real-Time Feed Synchronization
export interface FirestoreCloudPostRecord {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  privacy: 'public' | 'friends' | 'only_me';
  mediaUrl?: string;
  mediaType?: string;
  gradientBg?: string;
  location?: string;
  feeling?: {
    type: string;
    emoji: string;
    labelEn: string;
    labelBn: string;
  };
  isLive?: boolean;
  poll?: any;
  scheduledFor?: string;
  expiresAt?: string;
  reactions?: Record<string, number>;
  userReactions?: Record<string, string>;
  comments?: any[];
  sharesCount?: number;
  reactionsCount?: number;
  driveFileId?: string;
  driveFileName?: string;
  driveWebViewLink?: string;
  musicTitle?: string;
  audioUrl?: string;
  timestampMs?: number;
  createdAt?: any;
}

export const savePostToFirestoreCloud = async (params: {
  postId: string;
  content: string;
  privacy: 'public' | 'friends' | 'only_me';
  driveFileId?: string;
  driveFileName?: string;
  driveWebViewLink?: string;
  mediaUrl?: string;
  mediaType?: string;
  gradientBg?: string;
  location?: string;
  feeling?: any;
  isLive?: boolean;
  musicTitle?: string;
  audioUrl?: string;
  poll?: any;
  scheduledFor?: string;
  expiresAt?: string;
  reactions?: Record<string, number>;
  userReactions?: Record<string, string>;
  comments?: any[];
  sharesCount?: number;
}) => {
  const user = auth.currentUser;
  if (!user) return;

  const safePostId = getSafeUid(params.postId);
  const safeUid = getSafeUid(user.uid);

  const payload: Record<string, unknown> = {
    authorId: safeUid,
    authorName: (user.displayName || 'Bandhan User').slice(0, 120),
    authorAvatar: (
      user.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`
    ).slice(0, 2048),
    content: (params.content.trim() || 'Shared a post').slice(0, 5000),
    privacy: params.privacy,
    reactions: params.reactions || {
      like: 0,
      love: 0,
      care: 0,
      haha: 0,
      wow: 0,
      sad: 0,
      angry: 0,
    },
    userReactions: params.userReactions || {},
    reactionsCount: Object.keys(params.userReactions || {}).length,
    comments: params.comments || [],
    commentsCount: Array.isArray(params.comments) ? params.comments.length : 0,
    sharesCount: params.sharesCount || 0,
    timestampMs: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (isCloudPlayableUrl(params.mediaUrl)) payload.mediaUrl = params.mediaUrl;
  if (params.mediaType && isCloudPlayableUrl(params.mediaUrl)) payload.mediaType = params.mediaType;
  if (params.gradientBg) payload.gradientBg = params.gradientBg.slice(0, 160);
  if (params.location) payload.location = params.location.slice(0, 160);
  if (params.feeling) payload.feeling = params.feeling;
  if (params.isLive) payload.isLive = true;
  if (params.poll) payload.poll = params.poll;
  if (params.scheduledFor) payload.scheduledFor = params.scheduledFor;
  if (params.expiresAt) payload.expiresAt = params.expiresAt;
  if (params.musicTitle) payload.musicTitle = params.musicTitle.slice(0, 120);
  if (isCloudPlayableUrl(params.audioUrl)) payload.audioUrl = params.audioUrl;
  if (params.driveFileId) payload.driveFileId = params.driveFileId.slice(0, 128);
  if (params.driveFileName) payload.driveFileName = params.driveFileName.slice(0, 256);
  if (params.driveWebViewLink) payload.driveWebViewLink = params.driveWebViewLink.slice(0, 2048);

  try {
    await setDoc(doc(db, 'cloudPosts', safePostId), payload, { merge: true });
  } catch (error) {
    console.warn(`Cloud post save warning (${safePostId}):`, error);
  }
};

export const updatePostInFirestoreCloud = async (
  postId: string,
  patch: Record<string, unknown>,
) => {
  const user = auth.currentUser;
  if (!user) return;
  const safePostId = getSafeUid(postId);
  try {
    await setDoc(
      doc(db, 'cloudPosts', safePostId),
      {
        ...patch,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.warn(`Cloud post update notice (${safePostId}):`, error);
  }
};

export const deletePostFromFirestoreCloud = async (postId: string) => {
  const user = auth.currentUser;
  if (!user) return;

  const safePostId = getSafeUid(postId);
  try {
    await deleteDoc(doc(db, 'cloudPosts', safePostId));
  } catch (error) {
    console.warn(`Cloud post delete warning (${safePostId}):`, error);
  }
};

const mapCloudPostDoc = (d: any): FirestoreCloudPostRecord => {
  const data = d.data();
  const createdMs =
    typeof data.timestampMs === 'number'
      ? data.timestampMs
      : data.createdAt?.toMillis?.() || 0;
  return {
    id: d.id,
    authorId: String(data.authorId || ''),
    authorName: String(data.authorName || 'Bandhan User'),
    authorAvatar: String(data.authorAvatar || ''),
    content: String(data.content || ''),
    privacy: (data.privacy as 'public' | 'friends' | 'only_me') || 'public',
    mediaUrl: data.mediaUrl ? String(data.mediaUrl) : undefined,
    mediaType: data.mediaType ? String(data.mediaType) : undefined,
    gradientBg: data.gradientBg ? String(data.gradientBg) : undefined,
    location: data.location ? String(data.location) : undefined,
    feeling: data.feeling || undefined,
    isLive: Boolean(data.isLive),
    poll: data.poll || undefined,
    scheduledFor: data.scheduledFor ? String(data.scheduledFor) : undefined,
    expiresAt: data.expiresAt ? String(data.expiresAt) : undefined,
    reactions: data.reactions || undefined,
    userReactions: data.userReactions || undefined,
    comments: Array.isArray(data.comments) ? data.comments : undefined,
    sharesCount: typeof data.sharesCount === 'number' ? data.sharesCount : 0,
    reactionsCount: typeof data.reactionsCount === 'number' ? data.reactionsCount : 0,
    driveFileId: data.driveFileId ? String(data.driveFileId) : undefined,
    driveFileName: data.driveFileName ? String(data.driveFileName) : undefined,
    driveWebViewLink: data.driveWebViewLink ? String(data.driveWebViewLink) : undefined,
    musicTitle: data.musicTitle ? String(data.musicTitle) : undefined,
    audioUrl: data.audioUrl ? String(data.audioUrl) : undefined,
    timestampMs: createdMs,
    createdAt: data.createdAt,
  };
};

export const subscribeToPublicCloudPosts = (
  onUpdate: (records: FirestoreCloudPostRecord[]) => void,
) => {
  if (!auth.currentUser) return () => {};
  const safeUid = getSafeUid(auth.currentUser.uid);

  let sharedDocs: FirestoreCloudPostRecord[] = [];
  let ownDocs: FirestoreCloudPostRecord[] = [];

  const emitMerged = () => {
    const map = new Map<string, FirestoreCloudPostRecord>();
    sharedDocs.forEach((docItem) => map.set(docItem.id, docItem));
    ownDocs.forEach((docItem) => map.set(docItem.id, docItem));
    const sorted = Array.from(map.values()).sort(
      (a, b) => (b.timestampMs || 0) - (a.timestampMs || 0),
    );
    onUpdate(sorted);
  };

  const qShared = query(
    collection(db, 'cloudPosts'),
    where('privacy', 'in', ['public', 'friends']),
    limit(80),
  );
  const qOwn = query(
    collection(db, 'cloudPosts'),
    where('authorId', '==', safeUid),
    limit(50),
  );

  const unsubShared = onSnapshot(
    qShared,
    (snapshot) => {
      sharedDocs = snapshot.docs.map(mapCloudPostDoc);
      emitMerged();
    },
    (error) => {
      console.warn('Cloud posts shared listener notice:', error);
    },
  );

  const unsubOwn = onSnapshot(
    qOwn,
    (snapshot) => {
      ownDocs = snapshot.docs.map(mapCloudPostDoc);
      emitMerged();
    },
    (error) => {
      console.warn('Cloud posts own listener notice:', error);
    },
  );

  return () => {
    unsubShared();
    unsubOwn();
  };
};

// 8. 24-Hour Cloud Stories Synchronization
export const saveStoryToFirestoreCloud = async (story: {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  mediaUrl?: string;
  videoUrl?: string;
  mediaType?: string;
  text?: string;
  gradientBg?: string;
  audioUrl?: string;
  audioTitle?: string;
  audioArtist?: string;
}) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeId = getSafeUid(story.id);
  const safeUid = getSafeUid(user.uid);
  const expiresAtMs = Date.now() + 24 * 60 * 60 * 1000;
  const safeMediaUrl = isCloudPlayableUrl(story.mediaUrl) ? story.mediaUrl : undefined;
  const safeVideoUrl = isCloudPlayableUrl(story.videoUrl) ? story.videoUrl : undefined;
  const safeAudioUrl = isCloudPlayableUrl(story.audioUrl) ? story.audioUrl : undefined;
  if (!safeMediaUrl && !safeVideoUrl && story.mediaType !== 'text' && !story.gradientBg) return;

  try {
    await setDoc(doc(db, 'cloudStories', safeId), {
      ...story,
      mediaUrl: safeMediaUrl || null,
      videoUrl: safeVideoUrl || null,
      audioUrl: safeAudioUrl || null,
      id: safeId,
      authorId: safeUid,
      reactions: {},
      userReactions: {},
      reactionUsers: [],
      timestampMs: Date.now(),
      createdAt: serverTimestamp(),
      expiresAt: expiresAtMs,
    });
  } catch (err) {
    console.warn('Cloud story save notice:', err);
  }
};

export const deleteStoryFromFirestoreCloud = async (storyId: string) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeId = getSafeUid(storyId);
  try {
    await deleteDoc(doc(db, 'cloudStories', safeId));
  } catch (err) {
    console.warn('Cloud story delete notice:', err);
  }
};

export const reactToStoryCloud = async (
  storyId: string,
  emoji: string,
  userInfo: { userId: string; userName: string; userAvatar: string },
) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeId = getSafeUid(storyId);
  const safeUid = getSafeUid(user.uid);
  const storyRef = doc(db, 'cloudStories', safeId);
  try {
    const snap = await getDoc(storyRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const reactions: Record<string, number> = { ...(data.reactions || {}) };
    reactions[emoji] = (reactions[emoji] || 0) + 1;

    const userReactions: Record<string, string> = { ...(data.userReactions || {}) };
    userReactions[safeUid] = emoji;

    const prevReactionUsers = Array.isArray(data.reactionUsers)
      ? data.reactionUsers.filter((u: any) => u.userId !== safeUid)
      : [];
    const newReactionUser = {
      userId: safeUid,
      userName: userInfo.userName || user.displayName || 'Bandhan Member',
      userAvatar: userInfo.userAvatar || user.photoURL || '',
      emoji,
      createdAt: 'Just now',
    };

    await setDoc(
      storyRef,
      {
        reactions,
        userReactions,
        reactionUsers: [newReactionUser, ...prevReactionUsers].slice(0, 50),
      },
      { merge: true },
    );
  } catch (err) {
    console.warn('Cloud story reaction notice:', err);
  }
};

export const subscribeToCloudStories = (onUpdate: (stories: any[]) => void) => {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, 'cloudStories'), limit(60));
  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const activeStories = snapshot.docs
        .map((d) => ({ ...d.data(), id: d.id }))
        .filter((s: any) => !s.expiresAt || s.expiresAt > now)
        .sort((a: any, b: any) => (b.timestampMs || 0) - (a.timestampMs || 0));
      onUpdate(activeStories);
    },
    (err) => {
      console.warn('Cloud stories listener notice:', err);
    },
  );
};

export const subscribeToCloudUsers = (
  onUpdate: (
    users: Array<{
      uid: string;
      name: string;
      nameBn?: string;
      username: string;
      avatar: string;
      bio?: string;
      city?: string;
      isOnline?: boolean;
    }>,
  ) => void,
) => {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, 'users'), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          uid: String(data.uid || d.id),
          name: String(data.name || 'Bandhan Member'),
          nameBn: data.nameBn ? String(data.nameBn) : undefined,
          username: String(data.username || d.id),
          avatar: String(
            data.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(String(data.name || 'User'))}`,
          ),
          bio: data.bio ? String(data.bio) : undefined,
          city: data.city ? String(data.city) : undefined,
          isOnline: data.isOnline !== false,
        };
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('Cloud users listener notice:', err);
    },
  );
};

// 9. Realtime WebRTC Call Signaling via Firestore
export const createCallSessionCloud = async (
  callId: string,
  offer: RTCSessionDescriptionInit,
  caller: any = null,
  callee: any = null,
) => {
  const safeCallId = getSafeUid(callId);
  await setDoc(doc(db, 'cloudCalls', safeCallId), {
    callId: safeCallId,
    caller: caller || auth.currentUser?.uid || 'user',
    callee: callee || 'peer',
    offer: { type: offer.type, sdp: offer.sdp },
    status: 'calling',
    createdAt: Date.now(),
  });
};

export const answerCallSessionCloud = async (callId: string, answer: RTCSessionDescriptionInit) => {
  const safeCallId = getSafeUid(callId);
  await setDoc(
    doc(db, 'cloudCalls', safeCallId),
    {
      answer: { type: answer.type, sdp: answer.sdp },
      status: 'connected',
      answeredAt: Date.now(),
    },
    { merge: true },
  );
};

export const sendCallCandidateCloud = async (
  callId: string,
  candidate: RTCIceCandidateInit,
  role: 'caller' | 'callee' = 'caller',
) => {
  const safeCallId = getSafeUid(callId);
  const candId = `${role}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const candPayload =
    typeof (candidate as any).toJSON === 'function' ? (candidate as any).toJSON() : candidate;
  await setDoc(doc(db, 'cloudCalls', safeCallId, 'candidates', candId), {
    candidate: candPayload,
    role,
    timestamp: Date.now(),
  });
};

export const listenToCallSessionCloud = (
  callId: string,
  onUpdate: (data: any) => void,
  onCandidate?: (cand: any) => void,
) => {
  const safeCallId = getSafeUid(callId);
  const unsubCall = onSnapshot(doc(db, 'cloudCalls', safeCallId), (snap) => {
    if (snap.exists()) onUpdate(snap.data());
  });

  let unsubCandidates = () => {};
  if (onCandidate) {
    unsubCandidates = onSnapshot(
      collection(db, 'cloudCalls', safeCallId, 'candidates'),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            onCandidate(change.doc.data());
          }
        });
      },
    );
  }

  return () => {
    unsubCall();
    unsubCandidates();
  };
};

// 10. Real-Time Messenger, Cloud Chat Discovery & Group Chat via Firestore
export interface CloudChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  recipientId: string;
  text: string;
  audioUrl?: string;
  audioDuration?: number;
  imageUrl?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  replyToId?: string;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  timestamp: number;
  isRead?: boolean;
  seenAt?: number;
}

export interface CloudChatSummary {
  chatId: string;
  participants: string[];
  participantProfiles?: Record<
    string,
    {
      name?: string;
      avatar?: string;
    }
  >;
  lastMessageText?: string;
  lastSenderId?: string;
  lastSenderName?: string;
  lastTimestamp?: number;
}

export const sendChatMessageCloud = async (
  chatId: string,
  message: {
    id: string;
    senderId: string;
    senderName?: string;
    senderAvatar?: string;
    recipientId: string;
    recipientName?: string;
    recipientAvatar?: string;
    text: string;
    audioUrl?: string;
    audioDuration?: number;
    imageUrl?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    replyToId?: string;
    replyTo?: { id: string; text: string; senderName: string };
  },
) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeChatId = getSafeUid(chatId);
  const safeMsgId = getSafeUid(message.id);
  const safeSenderUid = getSafeUid(user.uid);
  const safeRecipientUid = getSafeUid(message.recipientId);
  const nowMs = Date.now();

  const resolvedMediaUrl = isCloudPlayableUrl(message.mediaUrl || message.imageUrl)
    ? message.mediaUrl || message.imageUrl
    : undefined;
  const resolvedAudioUrl = isCloudPlayableUrl(message.audioUrl) ? message.audioUrl : undefined;

  const msgPayload: Record<string, unknown> = {
    id: safeMsgId,
    senderId: safeSenderUid,
    senderName: (message.senderName || user.displayName || 'Bandhan Member').slice(0, 120),
    senderAvatar: (
      message.senderAvatar ||
      user.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(message.senderName || 'User')}`
    ).slice(0, 2048),
    recipientId: safeRecipientUid,
    text: (message.text || '').slice(0, 4000),
    timestamp: nowMs,
    isRead: false,
    createdAt: serverTimestamp(),
  };

  if (resolvedMediaUrl) {
    msgPayload.imageUrl = resolvedMediaUrl;
    msgPayload.mediaUrl = resolvedMediaUrl;
    if (message.mediaType) msgPayload.mediaType = message.mediaType;
  }
  if (resolvedAudioUrl) {
    msgPayload.audioUrl = resolvedAudioUrl;
    if (typeof message.audioDuration === 'number') {
      msgPayload.audioDuration = message.audioDuration;
    }
  }
  if (message.replyTo) {
    msgPayload.replyTo = message.replyTo;
    msgPayload.replyToId = message.replyTo.id;
  } else if (message.replyToId) {
    msgPayload.replyToId = message.replyToId;
  }

  await setDoc(doc(db, 'cloudChats', safeChatId, 'messages', safeMsgId), msgPayload);

  const previewLabel =
    message.text?.trim() ||
    (resolvedAudioUrl
      ? '🎙️ Voice Note'
      : message.mediaType === 'video'
      ? '🎬 Video'
      : resolvedMediaUrl
      ? '📷 Photo'
      : 'New message');

  const participants = [safeSenderUid, safeRecipientUid].sort();
  const participantProfiles: Record<string, { name: string; avatar: string }> = {
    [safeSenderUid]: {
      name: (message.senderName || user.displayName || 'Bandhan Member').slice(0, 120),
      avatar: (
        message.senderAvatar ||
        user.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(message.senderName || 'User')}`
      ).slice(0, 2048),
    },
  };
  if (message.recipientName) {
    participantProfiles[safeRecipientUid] = {
      name: message.recipientName.slice(0, 120),
      avatar: (
        message.recipientAvatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(message.recipientName)}`
      ).slice(0, 2048),
    };
  }

  await setDoc(
    doc(db, 'cloudChats', safeChatId),
    {
      chatId: safeChatId,
      participants,
      participantProfiles,
      lastMessageText: previewLabel.slice(0, 200),
      lastSenderId: safeSenderUid,
      lastSenderName: (message.senderName || user.displayName || 'Bandhan Member').slice(0, 120),
      lastTimestamp: nowMs,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const deleteChatMessageCloud = async (chatId: string, messageId: string) => {
  if (!auth.currentUser) return;
  const safeChatId = getSafeUid(chatId);
  const safeMsgId = getSafeUid(messageId);
  try {
    await deleteDoc(doc(db, 'cloudChats', safeChatId, 'messages', safeMsgId));
  } catch (err) {
    console.warn('Delete chat message cloud notice:', err);
  }
};

export const subscribeToUserCloudChats = (
  uid: string,
  onUpdate: (chats: CloudChatSummary[]) => void,
) => {
  if (!auth.currentUser) return () => {};
  const safeUid = getSafeUid(uid);
  const q = query(
    collection(db, 'cloudChats'),
    where('participants', 'array-contains', safeUid),
    limit(50),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: CloudChatSummary[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          chatId: String(data.chatId || d.id),
          participants: Array.isArray(data.participants) ? data.participants : [],
          participantProfiles: data.participantProfiles || undefined,
          lastMessageText: data.lastMessageText ? String(data.lastMessageText) : undefined,
          lastSenderId: data.lastSenderId ? String(data.lastSenderId) : undefined,
          lastSenderName: data.lastSenderName ? String(data.lastSenderName) : undefined,
          lastTimestamp: typeof data.lastTimestamp === 'number' ? data.lastTimestamp : undefined,
        };
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('User cloud chats discovery notice:', err);
    },
  );
};

export const subscribeToChatMessagesCloud = (
  chatId: string,
  onUpdate: (messages: CloudChatMessage[]) => void,
) => {
  if (!auth.currentUser) return () => {};
  const safeChatId = getSafeUid(chatId);
  const q = query(
    collection(db, 'cloudChats', safeChatId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ ...(d.data() as CloudChatMessage), id: d.id }));
      onUpdate(msgs);
    },
    (err) => {
      console.warn('Chat listener notice:', err);
    },
  );
};

export const clearChatMessagesCloud = async (chatId: string) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeChatId = getSafeUid(chatId);
  const safeUid = getSafeUid(user.uid);
  try {
    const snap = await getDocs(collection(db, 'cloudChats', safeChatId, 'messages'));
    const deletions = snap.docs
      .filter((d) => d.data()?.senderId === safeUid)
      .map((d) => deleteDoc(d.ref));
    await Promise.allSettled(deletions);
  } catch (err) {
    console.warn('Clear chat cloud notice:', err);
  }
};

export const sendGroupChatMessageCloud = async (
  groupId: string,
  message: {
    id: string;
    senderName: string;
    senderAvatar: string;
    text: string;
  },
) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeGroupId = getSafeUid(groupId);
  const safeMsgId = getSafeUid(message.id);
  const safeUid = getSafeUid(user.uid);
  try {
    await setDoc(doc(db, 'cloudGroupChats', safeGroupId, 'messages', safeMsgId), {
      id: safeMsgId,
      groupId: safeGroupId,
      senderId: safeUid,
      senderName: (message.senderName || user.displayName || 'Bandhan Member').slice(0, 120),
      senderAvatar: (message.senderAvatar || user.photoURL || '').slice(0, 2048),
      text: message.text.slice(0, 4000),
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Group chat cloud send notice:', err);
  }
};

export const subscribeToGroupChatMessagesCloud = (
  groupId: string,
  onUpdate: (
    messages: Array<{
      id: string;
      groupId: string;
      senderId: string;
      senderName: string;
      senderAvatar: string;
      text: string;
      timestamp: number;
    }>,
  ) => void,
) => {
  if (!auth.currentUser) return () => {};
  const safeGroupId = getSafeUid(groupId);
  const q = query(
    collection(db, 'cloudGroupChats', safeGroupId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(80),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          groupId: String(data.groupId || safeGroupId),
          senderId: String(data.senderId || ''),
          senderName: String(data.senderName || 'Bandhan Member'),
          senderAvatar: String(data.senderAvatar || ''),
          text: String(data.text || ''),
          timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
        };
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('Group chat listener notice:', err);
    },
  );
};

// 11. Google Keep / Personal Notes Synchronization
export interface CloudNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  color?: string;
  isPinned?: boolean;
  tags?: string[];
  updatedAt: number;
}

export const saveNoteToCloud = async (note: CloudNote) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeId = getSafeUid(note.id);
  await setDoc(doc(db, 'cloudNotes', safeId), {
    ...note,
    userId: getSafeUid(user.uid),
    updatedAt: Date.now(),
  });
};

export const deleteNoteFromCloud = async (noteId: string) => {
  const safeId = getSafeUid(noteId);
  await deleteDoc(doc(db, 'cloudNotes', safeId));
};

export const subscribeToUserNotesCloud = (
  userId: string,
  onUpdate: (notes: CloudNote[]) => void,
) => {
  const q = query(collection(db, 'cloudNotes'), where('userId', '==', getSafeUid(userId)));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as CloudNote);
      onUpdate(list);
    },
    (err) => {
      console.warn('Notes listener notice:', err);
    },
  );
};

// 12. Voice Note Audio Upload to Firebase Storage
export const uploadVoiceNoteToStorage = async (
  audioBlob: Blob,
  chatId: string,
): Promise<string> => {
  const fileName = `voice_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webm`;
  const safeChatId = getSafeUid(chatId);
  const storageRef = ref(storage, `chats/${safeChatId}/${fileName}`);

  try {
    const uploadResult = await uploadBytes(storageRef, audioBlob, {
      contentType: audioBlob.type || 'audio/webm',
    });
    return await getDownloadURL(uploadResult.ref);
  } catch (storageErr) {
    console.warn('Firebase Storage upload fallback triggered:', storageErr);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to encode audio'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }
};

// 13. Cloud Reels Real-time Synchronization
export interface FirestoreCloudReelRecord {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  videoUrl: string;
  posterUrl?: string;
  caption: string;
  soundTitle?: string;
  likesCount: number;
  likedUserIds?: string[];
  viewsCount: number;
  sharesCount: number;
  commentsCount: number;
  comments?: any[];
  reactions?: Record<string, string>;
  timestampMs?: number;
  createdAt?: any;
}

export const saveReelToFirestoreCloud = async (reel: {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  caption: string;
  soundTitle?: string;
}) => {
  const user = auth.currentUser;
  if (!user || !isCloudPlayableUrl(reel.videoUrl)) return;
  const safeReelId = getSafeUid(reel.id);
  const safeUid = getSafeUid(user.uid);

  const payload: Record<string, unknown> = {
    id: safeReelId,
    authorId: safeUid,
    authorName: (user.displayName || 'Bandhan Creator').slice(0, 120),
    authorAvatar: (
      user.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Creator')}`
    ).slice(0, 2048),
    videoUrl: reel.videoUrl,
    posterUrl: isCloudPlayableUrl(reel.posterUrl) ? reel.posterUrl : null,
    caption: (reel.caption || '').slice(0, 1000),
    soundTitle: (reel.soundTitle || 'Original Audio - Bandhan').slice(0, 120),
    likesCount: 0,
    likedUserIds: [],
    viewsCount: 0,
    sharesCount: 0,
    commentsCount: 0,
    comments: [],
    timestampMs: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'cloudReels', safeReelId), payload, { merge: true });
  } catch (error) {
    console.warn(`Cloud reel save notice (${safeReelId}):`, error);
  }
};

export const deleteReelFromFirestoreCloud = async (reelId: string) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeId = getSafeUid(reelId);
  try {
    await deleteDoc(doc(db, 'cloudReels', safeId));
  } catch (error) {
    console.warn(`Cloud reel delete notice (${safeId}):`, error);
  }
};

export const addReelCommentCloud = async (reelId: string, comment: any) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeId = getSafeUid(reelId);
  const reelRef = doc(db, 'cloudReels', safeId);
  try {
    const snap = await getDoc(reelRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const existing = Array.isArray(data.comments) ? data.comments : [];
    const nextComments = [comment, ...existing].slice(0, 100);
    await setDoc(
      reelRef,
      {
        comments: nextComments,
        commentsCount: nextComments.length,
      },
      { merge: true },
    );
  } catch (err) {
    console.warn('Add reel comment cloud notice:', err);
  }
};

export const incrementReelSharesCloud = async (reelId: string) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeId = getSafeUid(reelId);
  try {
    await setDoc(
      doc(db, 'cloudReels', safeId),
      { sharesCount: increment(1) },
      { merge: true },
    );
  } catch (err) {
    console.warn('Increment reel shares cloud notice:', err);
  }
};

export const incrementReelViewsCloud = async (reelId: string) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeId = getSafeUid(reelId);
  try {
    await setDoc(
      doc(db, 'cloudReels', safeId),
      { viewsCount: increment(1) },
      { merge: true },
    );
  } catch {
    // Non-blocking
  }
};

export const subscribeToCloudReels = (
  onUpdate: (reels: FirestoreCloudReelRecord[]) => void,
) => {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, 'cloudReels'), limit(60));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: FirestoreCloudReelRecord[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          const tsMs =
            typeof data.timestampMs === 'number'
              ? data.timestampMs
              : data.createdAt?.toMillis?.() || 0;
          return {
            id: d.id,
            authorId: String(data.authorId || ''),
            authorName: String(data.authorName || 'Bandhan Creator'),
            authorAvatar: String(data.authorAvatar || ''),
            videoUrl: String(data.videoUrl || ''),
            posterUrl: data.posterUrl ? String(data.posterUrl) : undefined,
            caption: String(data.caption || ''),
            soundTitle: data.soundTitle ? String(data.soundTitle) : 'Original Audio',
            likesCount: Number(data.likesCount || 0),
            likedUserIds: Array.isArray(data.likedUserIds) ? data.likedUserIds : [],
            viewsCount: Number(data.viewsCount || 0),
            sharesCount: Number(data.sharesCount || 0),
            commentsCount: Number(data.commentsCount || 0),
            comments: Array.isArray(data.comments) ? data.comments : [],
            reactions: data.reactions || {},
            timestampMs: tsMs,
            createdAt: data.createdAt,
          };
        })
        .sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
      onUpdate(items);
    },
    (err) => {
      console.warn('Cloud reels listener notice:', err);
    },
  );
};

export const updateReelReactionCloud = async (
  reelId: string,
  reactionType: string,
  isLiking: boolean,
) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeId = getSafeUid(reelId);
  const safeUid = getSafeUid(user.uid);
  const reelRef = doc(db, 'cloudReels', safeId);
  try {
    const snap = await getDocFromServer(reelRef);
    if (!snap.exists()) return;
    const data = snap.data();
    let likedUserIds: string[] = Array.isArray(data.likedUserIds) ? [...data.likedUserIds] : [];
    let likesCount = Number(data.likesCount || 0);

    if (isLiking) {
      if (!likedUserIds.includes(safeUid)) {
        likedUserIds.push(safeUid);
        likesCount += 1;
      }
    } else {
      likedUserIds = likedUserIds.filter((id) => id !== safeUid);
      likesCount = Math.max(0, likesCount - 1);
    }

    await setDoc(
      reelRef,
      {
        likedUserIds,
        likesCount,
        reactions: {
          ...(data.reactions || {}),
          [safeUid]: isLiking ? reactionType : null,
        },
      },
      { merge: true },
    );
  } catch (error) {
    console.warn('Update reel reaction error:', error);
  }
};

// 14. Cloud Post Reactions Synchronization
export const updatePostReactionCloud = async (
  postId: string,
  reactionType: string | null,
) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeId = getSafeUid(postId);
  const safeUid = getSafeUid(user.uid);
  const postRef = doc(db, 'cloudPosts', safeId);
  try {
    const snap = await getDocFromServer(postRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const userReactions: Record<string, string> = { ...(data.userReactions || {}) };
    const reactions: Record<string, number> = {
      like: 0,
      love: 0,
      care: 0,
      haha: 0,
      wow: 0,
      sad: 0,
      angry: 0,
      ...(data.reactions || {}),
    };

    const prevReaction = userReactions[safeUid];
    if (prevReaction) {
      reactions[prevReaction] = Math.max(0, (reactions[prevReaction] || 1) - 1);
    }

    if (reactionType && prevReaction !== reactionType) {
      userReactions[safeUid] = reactionType;
      reactions[reactionType] = (reactions[reactionType] || 0) + 1;
    } else {
      delete userReactions[safeUid];
    }

    const reactionsCount = Object.keys(userReactions).length;

    await setDoc(
      postRef,
      {
        reactions,
        userReactions,
        reactionsCount,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.warn('Update post reaction error:', error);
  }
};

// 15. Chat Typing Indicators & Seen Receipts
export const setChatTypingStatusCloud = async (
  chatId: string,
  isTyping: boolean,
  userName?: string,
) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeChatId = getSafeUid(chatId);
  const safeUid = getSafeUid(user.uid);
  const typingRef = doc(db, 'cloudChats', safeChatId, 'typing', safeUid);
  try {
    if (isTyping) {
      await setDoc(typingRef, {
        userId: safeUid,
        userName: userName || user.displayName || 'Friend',
        isTyping: true,
        updatedAt: Date.now(),
      });
    } else {
      await deleteDoc(typingRef);
    }
  } catch {
    // Non-blocking
  }
};

export const subscribeToChatTypingStatusCloud = (
  chatId: string,
  onUpdate: (typingUsers: { userId: string; userName: string }[]) => void,
) => {
  if (!auth.currentUser) return () => {};
  const safeChatId = getSafeUid(chatId);
  const typingCol = collection(db, 'cloudChats', safeChatId, 'typing');
  return onSnapshot(
    typingCol,
    (snapshot) => {
      const currentUid = auth.currentUser ? getSafeUid(auth.currentUser.uid) : '';
      const now = Date.now();
      const activeTyping = snapshot.docs
        .map((d) => d.data())
        .filter((d) => d.userId !== currentUid && d.isTyping && now - (d.updatedAt || 0) < 6000)
        .map((d) => ({ userId: String(d.userId), userName: String(d.userName || 'Friend') }));
      onUpdate(activeTyping);
    },
    (err) => {
      console.warn('Typing status listener notice:', err);
    },
  );
};

export const markChatMessageSeenCloud = async (chatId: string, messageId: string) => {
  const user = auth.currentUser;
  if (!user) return;
  const safeChatId = getSafeUid(chatId);
  const safeMsgId = getSafeUid(messageId);
  try {
    await setDoc(
      doc(db, 'cloudChats', safeChatId, 'messages', safeMsgId),
      {
        isRead: true,
        seenAt: Date.now(),
        seenBy: getSafeUid(user.uid),
      },
      { merge: true },
    );
  } catch {
    // Non-blocking
  }
};
