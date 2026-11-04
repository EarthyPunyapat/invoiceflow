import { supportEmail } from "@/lib/legal";

/** "contact us at <address>", or a safe fallback when SUPPORT_EMAIL is not set. */
export function SupportContact() {
  const email = supportEmail();
  if (!email) return <>through the contact details in your account settings</>;
  return (
    <>
      by email at <a href={`mailto:${email}`}>{email}</a>
    </>
  );
}
