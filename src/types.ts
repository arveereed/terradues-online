export type ApprovalStatus = "pending" | "approved" | "denied";
export type AccountStatus = "active" | "archived";

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

  picture: string | null;
  document: string | null;

  fullName: string;
  address: string;
  role?: "resident" | "admin";
  approvalStatus?: ApprovalStatus;

  /*
   * Resident account lifecycle.
   *
   * Existing residents may not have this field.
   * Missing accountStatus is treated as active.
   */
  accountStatus?: AccountStatus;
};

export type UserDataSignUpRenterType = Omit<
  UserDataSignUpOwnerType,
  "familyMembers" | "occupancyType" | "forRent"
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

type ApprovalMetadata = {
  /*
   * ACTIVE / ARCHIVED
   */
  accountStatus?: AccountStatus;

  /*
   * Set when an admin deletes/archives the resident.
   */
  archivedAt?: FirestoreTimestamp;

  /*
   * Set to 30 days after archivedAt.
   * The server cleanup uses this timestamp to determine
   * when the account can be permanently deleted.
   */
  scheduledDeletionAt?: FirestoreTimestamp;

  approvedAt?: FirestoreTimestamp;
  approvedBy?: string;

  deniedAt?: FirestoreTimestamp;
  deniedBy?: string;
  denialReason?: string;
};

type UserOwner = UserDataSignUpOwnerType &
  ApprovalMetadata & {
    id: string;
    createdAt: FirestoreTimestamp;
  };

type UserRenter = UserDataSignUpRenterType &
  ApprovalMetadata & {
    id: string;
    createdAt: FirestoreTimestamp;
  };

// Main user type
export type User = UserRenter | UserOwner;
