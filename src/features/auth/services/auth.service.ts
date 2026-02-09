import {
  addDoc,
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import type {
  UserDataSignUpOwnerType,
  UserDataSignUpRenterType,
  User,
} from "../../../types";
import { db } from "../../../lib/firebase/firebase";

export const addUser = async (
  userData: UserDataSignUpOwnerType | UserDataSignUpRenterType,
) => {
  const usersCollection = collection(db, "users");

  const docRef = await addDoc(usersCollection, {
    ...userData,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getUserById = async (userId: string | undefined) => {
  try {
    const usersCollection = collection(db, "users");
    const q = query(usersCollection, where("user_id", "==", userId));

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return { ...(docSnap.data() as User), id: docSnap.id };
    }

    console.warn(`No user found with ID: ${userId}`);
    return null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};
