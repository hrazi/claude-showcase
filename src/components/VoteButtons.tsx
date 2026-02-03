interface VoteButtonsProps {
  upvotes: number;
  downvotes: number;
  userVote?: number;
  onVote: (vote: 1 | -1) => void;
  onRemoveVote: () => void;
  disabled?: boolean;
}

export function VoteButtons({ upvotes, downvotes, userVote, onVote, onRemoveVote, disabled }: VoteButtonsProps) {
  const score = upvotes - downvotes;

  const handleUpvote = () => {
    if (userVote === 1) {
      onRemoveVote();
    } else {
      onVote(1);
    }
  };

  const handleDownvote = () => {
    if (userVote === -1) {
      onRemoveVote();
    } else {
      onVote(-1);
    }
  };

  return (
    <div className="vote-buttons">
      <button
        className={`vote-btn upvote ${userVote === 1 ? 'active' : ''}`}
        onClick={handleUpvote}
        disabled={disabled}
        title="Upvote"
      >
        ▲
      </button>
      <span className="vote-score">{score}</span>
      <button
        className={`vote-btn downvote ${userVote === -1 ? 'active' : ''}`}
        onClick={handleDownvote}
        disabled={disabled}
        title="Downvote"
      >
        ▼
      </button>
    </div>
  );
}
