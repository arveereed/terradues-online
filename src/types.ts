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
