export type UserDataSignUpType = {
  user_id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  contactNumber: string;
  email: string;
  gender: string;
  phase: string;
  block: string;
  lot: string;
  familyMembers: string;
  occupied: boolean;
  forRent: boolean;
  picture: string | ArrayBuffer | null;
  document: string | null;
};

// Firestore timestamp structure
export interface FirestoreTimestamp {
  type: "firestore/timestamp/1.0";
  seconds: number;
  nanoseconds: number;
}

// Main user type
export interface User {
  id: string;
  user_id: string;

  firstName: string;
  middleName: string;
  lastName: string;
  gender: "Male" | "Female" | "Other"; // extensible
  email: string;
  contactNumber: string;

  block: string;
  lot: string;
  phase: string;
  familyMembers: string;

  occupied: boolean;
  forRent: boolean;

  picture: string; // Cloudinary image URL
  document: string; // Cloudinary PDF URL

  createdAt: FirestoreTimestamp;
}
