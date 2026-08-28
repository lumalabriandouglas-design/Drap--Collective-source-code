import { createFileRoute } from "@tanstack/react-router";
import { DeskInbox } from "@/components/desk-room";
import { RoomSkeleton } from "@/components/house-room";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { getFloorSession } from "@/lib/floor-auth";
import { useHouseRole } from "@/lib/use-role";

export const Route = createFileRoute("/desk/")({ component: DeskHome });

function DeskHome() {
  const { user, isPending, isAdmin, isDesigner } = useHouseRole();
  const session = getFloorSession();
  if (isPending) return <RoomSkeleton cards={2} />;
  if (!user) return <RedirectToSignIn />;
  const aliases = [session?.profileId, session?.brandName, session?.email].filter(Boolean) as string[];
  return <DeskInbox userId={session?.userId ?? user.id} isAdmin={isAdmin} aliases={aliases} isDesigner={isDesigner} />;
}
