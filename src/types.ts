export type UserDataSignUpOwnerType = {
  userType: "Owner" | "Renter";
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
type FirestoreTimestamp = {
  type: "firestore/timestamp/1.0";
  seconds: number;
  nanoseconds: number;
};

type UserOwner = UserDataSignUpOwnerType & {
  id: string; //
  createdAt: FirestoreTimestamp;
};

type UserRenter = UserDataSignUpRenterType & {
  id: string; //
  createdAt: FirestoreTimestamp;
};

// Main user type
export type User = UserRenter | UserOwner;
