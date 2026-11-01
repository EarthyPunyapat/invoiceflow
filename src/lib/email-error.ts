export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 502,
  ) {
    super(message);
  }
}
export function emailProviderError(error: {
  name?: string;
  message?: string;
}): EmailDeliveryError {
  const message = error.message || "";
  if (/testing emails|test(ing)? mode|own email address/i.test(message))
    return new EmailDeliveryError(
      "Your email provider is in test mode. Verify a sending domain before emailing clients.",
      "EMAIL_TEST_MODE",
    );
  if (/domain.*verif|sender.*verif|verif.*domain/i.test(message))
    return new EmailDeliveryError(
      "The email sending domain is not verified. Complete sender verification before trying again.",
      "EMAIL_SENDER_UNVERIFIED",
    );
  if (
    /api.?key|unauthori[sz]ed|authentication|restricted_api_key/i.test(
      message + " " + error.name,
    )
  )
    return new EmailDeliveryError(
      "The email service rejected its credentials. Check the deployment's email service configuration.",
      "EMAIL_CREDENTIALS_INVALID",
    );
  return new EmailDeliveryError(
    "The email service did not accept this invoice. Check the sender and recipient details, then try again.",
    "EMAIL_REJECTED",
  );
}
