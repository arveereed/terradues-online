export type UserDataSignUpOwnerType = {
  userType: string;
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

  picture: string | null;
  document: string | null;
};

export type UserDataSignUpRenterType = Omit<
  UserDataSignUpOwnerType,
  "familyMembers" | "occupied" | "forRent"
> & {
  ownerName: string;
  ownerContactNumber: string;
  ownerAddress: string;
  ownerNumberOccupants: string;
};

// Firestore timestamp structure
export interface FirestoreTimestamp {
  type: "firestore/timestamp/1.0";
  seconds: number;
  nanoseconds: number;
}

// Main userOwner type
export type UserOwner = UserDataSignUpOwnerType & {
  id: string; //
  createdAt: FirestoreTimestamp;
};

// Main userRenter type
export type UserRenter = UserDataSignUpRenterType & {
  id: string; //
  createdAt: FirestoreTimestamp;
};
