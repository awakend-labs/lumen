import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email"),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Use at least 8 characters").max(128, "Use 128 characters or fewer"),
  confirmPassword: z.string().min(1, "Confirm your new password"),
}).refine(value => value.newPassword === value.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
