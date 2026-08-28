import { GuestDoors, HouseMenu } from "@/components/house-menu";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot({ light = false }: { light?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <HouseMenu light={light} />;
  }
  if (user) return <HouseMenu light={light} />;
  return (
    <div className="flex items-center">
      <GuestDoors light={light} />
      <div className="sm:hidden">
        <HouseMenu light={light} />
      </div>
    </div>
  );
}
