import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// React cache is scoped to one server render, never shared between users or requests.
export const getServerSession = cache(async () => auth.api.getSession({ headers: await headers() }));
