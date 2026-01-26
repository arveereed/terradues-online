import { useSignUp } from "@clerk/clerk-react";
import { useState } from "react";
import type { UserDataSignUpType } from "../../types";

export default function SignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [pendingVerification, setPendingVerification] =
    useState<boolean>(false);
  const [code, setCode] = useState("");

  // Handle submission of sign-up form
  const onSignUpPress = async () => {
    if (!isLoaded) return;
    setIsLoading(true);

    if (!fullName || !address) {
      setError("Full name or address is empty");
      setIsLoading(false);
      return;
    }

    // Start sign-up process using email and password provided
    try {
      await signUp.create({
        emailAddress,
        password,
        unsafeMetadata: { fullName, address },
      });

      // Send user an email with verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // Set 'pendingVerification' to true to display second form
      // and capture OTP code
      setIsLoading(false);
      setError("");
      setPendingVerification(true);
    } catch (err: any) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      if (err.errors?.[0]?.code === "form_identifier_exists") {
        setError("That email address is taken. Please try another.");
      } else if (err.errors?.[0]?.code === "form_param_format_invalid") {
        setError("Email address must be a valid email address.");
      } else if (err.errors?.[0]?.code === "form_param_nil") {
        setError("Email or password is empty");
      } else if (err.errors?.[0]?.code === "form_password_length_too_short") {
        setError("Passwords must be 8 characters or more.");
      } else if (err.errors?.[0]?.code === "form_password_pwned") {
        setError("Please use a different password.");
      }
      setIsLoading(false);
      // console.error(JSON.stringify(err, null, 2));
    }
  };

  // Handle submission of verification form
  const onVerifyPress = async () => {
    if (!isLoaded) return;
    setIsLoading(true);

    try {
      // Use the code the user provided to attempt verification
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      // If verification was completed, set the session to active
      // and redirect the user
      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });

        /* const userData: UserDataSignUpType = {
          user_id: signUpAttempt.createdUserId as string,
          fullName: signUpAttempt.unsafeMetadata.fullName as string,
          address: signUpAttempt.unsafeMetadata.address as string,
          email: signUpAttempt.emailAddress as string,
        }; */
        // addUser(userData);

        // router.replace("/");
        setIsLoading(false);
      } else {
        // If the status is not complete, check why. User may need to
        // complete further steps.
        setIsLoading(false);

        console.error(JSON.stringify(signUpAttempt, null, 2));
      }
    } catch (err: any) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      if (err.errors?.[0]?.code === "too_many_requests") {
        setError("Too many requests. Please try again in a bit.");
      } else if (err.errors?.[0]?.code === "form_param_nil") {
        setError("Enter a code");
      } else if (err.errors?.[0]?.code === "form_code_incorrect") {
        setError("The code is incorrect");
      }
      setIsLoading(false);

      // console.error(JSON.stringify(err, null, 2));
    }
  };

  return <div>SignUp REnter</div>;
}
