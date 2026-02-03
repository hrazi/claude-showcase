import { useState } from 'react';
import { Item, User } from '../types';
import { VoteButtons } from './VoteButtons';
import { CommentSection } from './CommentSection';

interface ItemCardProps {
  item: Item;
  user: User | null;
  onVoteChange: (itemId: string, upvotes: number, downvotes: number, userVote?: number) => void;
  onCommentCountChange: (itemId: string, commentCount: number) => void;
}

export function ItemCard({ item, user, onVoteChange, onCommentCountChange }: ItemCardProps) {
  const [showComments, setShowComments] = useState(false);

  const handleVote = async (vote: 1 | -1) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/items/${item.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vote })
      });
      if (response.ok) {
        const data = await response.json();
        onVoteChange(item.id, data.upvotes, data.downvotes, data.userVote);
      }
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleRemoveVote = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/items/${item.id}/vote`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        onVoteChange(item.id, data.upvotes, data.downvotes, undefined);
      }
    } catch (error) {
      console.error('Failed to remove vote:', error);
    }
  };

  const formattedDate = new Date(item.createdAt).toLocaleDateString();

  return (
    <div className="item-card">
      <div className="item-header">
        <VoteButtons
          upvotes={item.upvotes}
          downvotes={item.downvotes}
          userVote={item.userVote}
          onVote={handleVote}
          onRemoveVote={handleRemoveVote}
          disabled={!user}
        />
        <div className="item-content">
          <h3 className="item-title">
            <a href={item.link} target="_blank" rel="noopener noreferrer">
              {item.title}
            </a>
          </h3>
          <p className="item-description">{item.description}</p>
          <div className="item-meta">
            <span>by {item.authorName}</span>
            <span>{formattedDate}</span>
            <button
              className="comment-toggle"
              onClick={() => setShowComments(!showComments)}
            >
              {item.commentCount} comment{item.commentCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
      {showComments && (
        <CommentSection
          itemId={item.id}
          user={user}
          onCommentCountChange={(count) => onCommentCountChange(item.id, count)}
        />
      )}
    </div>
  );
}
