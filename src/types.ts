export interface UserDataSignUpType {
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
  document: File | null;
}
