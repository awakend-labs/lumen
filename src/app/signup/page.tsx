import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthForm } from "@/features/auth/components/auth-form";
import { redirect } from "next/navigation";
import { getServerSession } from "@/server/session";

export const metadata = { title: "Sign up" };

export default async function SignupPage() {
  if (await getServerSession()) redirect("/dashboard");
  return (
    <Suspense fallback={<Skeleton className="m-auto h-96 w-full max-w-sm" />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
