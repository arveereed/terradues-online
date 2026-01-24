import { addDoc, collection, Timestamp } from "firebase/firestore";
import type { UserDataSignUpType } from "../../../types";
import { db } from "../../../lib/firebase/firebase";

export const addUser = async (userData: UserDataSignUpType) => {
  const usersCollection = collection(db, "users");
  const docRef = await addDoc(usersCollection, {
    ...userData,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};
