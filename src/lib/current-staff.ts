import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentStaff() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!user?.isActive || (user.role !== Role.ADMIN && user.role !== Role.EDITOR)) return null;
  return user;
}
