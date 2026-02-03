import { useState, useEffect } from 'react';
import { Comment, User } from '../types';

interface CommentSectionProps {
  itemId: string;
  user: User | null;
  onCommentCountChange: (count: number) => void;
}

export function CommentSection({ itemId, user, onCommentCountChange }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [itemId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/items/${itemId}/comments`);
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/items/${itemId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment })
      });
      const comment = await response.json();
      setComments([...comments, comment]);
      setNewComment('');
      onCommentCountChange(comments.length + 1);
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      setComments(comments.filter(c => c.id !== commentId));
      onCommentCountChange(comments.length - 1);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  if (loading) {
    return <div className="comments-section">Loading comments...</div>;
  }

  return (
    <div className="comments-section">
      {comments.length === 0 ? (
        <p style={{ color: '#999', fontSize: '0.875rem' }}>No comments yet</p>
      ) : (
        comments.map(comment => (
          <div key={comment.id} className="comment">
            <div className="comment-header">
              <span className="comment-author">{comment.userName}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="comment-date">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
                {user && user.userId === comment.userId && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            <p className="comment-text">{comment.text}</p>
          </div>
        ))
      )}
      {user && (
        <form className="comment-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            disabled={submitting}
          />
          <button type="submit" className="btn btn-primary" disabled={submitting || !newComment.trim()}>
            {submitting ? '...' : 'Post'}
          </button>
        </form>
      )}
    </div>
  );
}
