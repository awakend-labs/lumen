import { z } from "zod";
import { signUpSchema } from "@/lib/validators";

export const profileNameSchema = signUpSchema.pick({ name: true });

export const profilePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(128, "Use 128 characters or fewer."),
  newPassword: signUpSchema.shape.password,
  confirmPassword: z.string().min(1, "Confirm your new password."),
}).refine(values => values.newPassword === values.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
}).refine(values => values.currentPassword !== values.newPassword, {
  message: "Choose a password different from your current one.",
  path: ["newPassword"],
});

export type ProfileNameInput = z.infer<typeof profileNameSchema>;
export type ProfilePasswordInput = z.infer<typeof profilePasswordSchema>;
