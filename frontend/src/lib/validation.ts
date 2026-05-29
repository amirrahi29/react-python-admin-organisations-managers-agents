export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_HINT =
  "At least 8 characters with uppercase, lowercase, number, and special character.";

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getEmailError(value: string): string | null {
  const email = normalizeEmail(value);

  if (!email) {
    return "Please enter your email.";
  }
  if (email.length > EMAIL_MAX_LENGTH) {
    return "Email is too long.";
  }
  if (!EMAIL_PATTERN.test(email)) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function getLoginPasswordError(value: string): string | null {
  if (!value) {
    return "Please enter your password.";
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return "Password is too long.";
  }
  return null;
}

export function getPasswordError(value: string): string | null {
  if (!value) {
    return "Password is required.";
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (!/[A-Z]/.test(value)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[a-z]/.test(value)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/\d/.test(value)) {
    return "Password must include at least one number.";
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    return "Password must include at least one special character.";
  }
  return null;
}

export function getConfirmPasswordMismatchError(
  password: string,
  confirmPassword: string,
): string | null {
  if (!confirmPassword) {
    return null;
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}

export function getConfirmPasswordError(
  password: string,
  confirmPassword: string,
): string | null {
  if (!confirmPassword) {
    return "Please confirm the password.";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}

export function isValidName(value: string, min = 2) {
  return value.trim().length >= min;
}

export function isValidPhone(value: string, min = 7) {
  return value.trim().length >= min;
}

export const NAME_PART_MAX_LENGTH = 60;

export function splitPersonName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName: firstName ?? "",
    lastName: rest.join(" "),
  };
}

export function getFirstNameError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "First name is required.";
  }
  if (trimmed.length < 2) {
    return "First name must be at least 2 characters.";
  }
  if (trimmed.length > NAME_PART_MAX_LENGTH) {
    return "First name is too long.";
  }
  return null;
}

export function getLastNameError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Last name is required.";
  }
  if (trimmed.length < 2) {
    return "Last name must be at least 2 characters.";
  }
  if (trimmed.length > NAME_PART_MAX_LENGTH) {
    return "Last name is too long.";
  }
  return null;
}
