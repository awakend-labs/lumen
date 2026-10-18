import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <Suspense fallback={<Skeleton className="m-auto h-96 w-full max-w-sm" />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
