import { redirect } from "next/navigation";
import { ProfileSettings } from "@/features/profile/components/profile-settings";
import { getServerSession } from "@/server/session";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await getServerSession();
  if (!session) redirect("/login?callbackUrl=%2Fprofile");

  const { name, email, image } = session.user;
  return <ProfileSettings key={session.user.id} user={{ name, email, image }} />;
}
