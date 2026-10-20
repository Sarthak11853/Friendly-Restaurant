import { acceptFriendRequest, removeFriendship, sendFriendRequest } from "@/app/friends/actions";
import type { FriendStatus } from "@/lib/friends";

export default function FriendButton({ userId, status }: { userId: string; status: FriendStatus }) {
  switch (status) {
    case "none":
      return (
        <form action={sendFriendRequest.bind(null, userId)}>
          <button className="btn-primary">Add friend</button>
        </form>
      );
    case "incoming":
      return (
        <div className="flex gap-2">
          <form action={acceptFriendRequest.bind(null, userId)}>
            <button className="btn-primary">Accept</button>
          </form>
          <form action={removeFriendship.bind(null, userId)}>
            <button className="btn-secondary">Decline</button>
          </form>
        </div>
      );
    case "outgoing":
      return (
        <form action={removeFriendship.bind(null, userId)}>
          <button className="btn-secondary">Cancel request</button>
        </form>
      );
    case "friends":
      return (
        <form action={removeFriendship.bind(null, userId)}>
          <button className="btn-secondary">Unfriend</button>
        </form>
      );
    default:
      return null;
  }
}
