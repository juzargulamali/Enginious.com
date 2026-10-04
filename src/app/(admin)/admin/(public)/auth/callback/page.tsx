import type { Metadata } from "next";
import { CallbackClient } from "./CallbackClient";

export const metadata: Metadata = { title: "Signing you in" };

export default function Callback() {
  return (
    <>
      <h1>Signing you in</h1>
      <CallbackClient />
    </>
  );
}
