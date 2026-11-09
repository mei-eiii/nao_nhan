import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

// DÁN firebaseConfig của cậu vào đây (lấy ở Project settings > Your apps)
const firebaseConfig = {
  apiKey: "AIzaSyDQzJkJtufB6kNeogsFQo4ammZJXfTzNu4",
  authDomain: "nao-nhan.firebaseapp.com",
  projectId: "nao-nhan",
  storageBucket: "nao-nhan.firebasestorage.app",
  messagingSenderId: "661828090041",
  appId: "1:661828090041:web:81eb5b779aa1d6f8e30368",
  measurementId: "G-E8M1MDCT96",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Đăng nhập ẩn danh: không cần email hay mật khẩu, mỗi trình duyệt có một ID riêng
export const ensureUser = (): Promise<string> =>
  new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve(user.uid);
      } else {
        signInAnonymously(auth).catch(reject);
      }
    });
  });

// Đăng một bài nói lên Bảng Vàng
export const sharePost = async (p: {
  name: string;
  avatar: string;
  color: string;
  topic: string;
  category: string;
  seconds: number;
  text: string;
}) => {
  const uid = await ensureUser();
  const ref = await addDoc(collection(db, "posts"), {
    uid,
    name: p.name.slice(0, 20),
    avatar: p.avatar.slice(0, 8),
    color: p.color.slice(0, 9),
    topic: p.topic.slice(0, 200),
    category: p.category.slice(0, 40),
    seconds: Math.min(1800, Math.max(10, Math.round(p.seconds))),
    text: p.text.slice(0, 5000),
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

// Xóa bài của chính mình
export const removePost = (id: string) => deleteDoc(doc(db, "posts", id));

// Báo cáo bài không phù hợp (mỗi người chỉ báo cáo một bài một lần)
export const reportPost = async (postId: string) => {
  const uid = await ensureUser();
  await setDoc(doc(db, "reports", `${postId}_${uid}`), {
    postId,
    uid,
    createdAt: serverTimestamp(),
  });
};

// Nghe Bảng Vàng theo thời gian thực. mode: "new" (mới nhất) | "top" (dài nhất)
export const listenPosts = (
  mode: "new" | "top",
  onData: (list: any[]) => void,
  onError: (e: any) => void
) => {
  const q = query(
    collection(db, "posts"),
    mode === "top" ? orderBy("seconds", "desc") : orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
};
