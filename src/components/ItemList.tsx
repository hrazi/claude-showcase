import { Item, User } from '../types';
import { ItemCard } from './ItemCard';

interface ItemListProps {
  items: Item[];
  user: User | null;
  onVoteChange: (itemId: string, upvotes: number, downvotes: number, userVote?: number) => void;
  onCommentCountChange: (itemId: string, commentCount: number) => void;
}

export function ItemList({ items, user, onVoteChange, onCommentCountChange }: ItemListProps) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <h2>No creations yet</h2>
        <p>Be the first to share something cool you built with Claude!</p>
      </div>
    );
  }

  return (
    <div className="item-list">
      {items.map(item => (
        <ItemCard
          key={item.id}
          item={item}
          user={user}
          onVoteChange={onVoteChange}
          onCommentCountChange={onCommentCountChange}
        />
      ))}
    </div>
  );
}
