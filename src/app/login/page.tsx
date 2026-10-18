import { Suspense } from "react";
import { AuthForm } from "@/features/auth/components/auth-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="m-auto h-96 w-full max-w-sm" />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
