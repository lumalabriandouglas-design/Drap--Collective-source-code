import { createFileRoute } from "@tanstack/react-router";
import { DeskConversation } from "@/components/desk-room";
import { RoomSkeleton } from "@/components/house-room";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { getFloorSession } from "@/lib/floor-auth";
import { useHouseRole } from "@/lib/use-role";

export const Route = createFileRoute("/desk/$threadId")({ component: DeskThreadPage });

function DeskThreadPage() {
  const { threadId } = Route.useParams();
  const { user, isPending, isAdmin } = useHouseRole();
  const session = getFloorSession();
  if (isPending) return <RoomSkeleton cards={2} />;
  if (!user) return <RedirectToSignIn />;
  const aliases = [session?.profileId, session?.brandName, session?.email].filter(Boolean) as string[];
  return (
    <DeskConversation
      threadId={threadId}
      userId={session?.userId ?? user.id}
      isAdmin={isAdmin}
      aliases={aliases}
    />
  );
}
