import type { Metadata } from "next";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Reset your password" };

export default function Forgot() {
  return (
    <>
      <h1>Reset your password</h1>
      <p className="adm-hint">Enter the email you were invited with. We will send a link that lets you choose a new password.</p>
      <ForgotForm />
    </>
  );
}
