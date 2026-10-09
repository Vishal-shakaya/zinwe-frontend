export const OTP_LENGTH = 6;

/** The digits typed so far, without gaps ("12 4" -> "124"). */
export function otpDigits(value: string): string {
  return value.replace(/\D/g, "");
}
