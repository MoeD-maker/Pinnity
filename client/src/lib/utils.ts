import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type PasswordStrength = {
  score: number;
  feedback: string;
};

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, feedback: "Password is required" };
  }

  let score = 0;
  let feedback = "Very weak";

  // Length check
  if (password.length > 0) score++;
  if (password.length >= 8) score++;

  // Character type checks
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Adjust score to be on a scale of 0-4
  score = Math.min(4, Math.floor(score * 0.8));

  // Set feedback based on score
  if (score === 0) feedback = "Very weak";
  else if (score === 1) feedback = "Weak";
  else if (score === 2) feedback = "Fair";
  else if (score === 3) feedback = "Good";
  else if (score === 4) feedback = "Strong";

  return { score, feedback };
}
