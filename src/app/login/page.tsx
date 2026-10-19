import { Suspense } from "react";
import { AuthForm } from "@/features/auth/components/auth-form";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";
import { getServerSession } from "@/server/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getServerSession()) redirect("/dashboard");
  return (
    <Suspense fallback={<Skeleton className="m-auto h-96 w-full max-w-sm" />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
