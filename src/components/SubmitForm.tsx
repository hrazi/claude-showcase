import { useState } from 'react';
import { Item } from '../types';

interface SubmitFormProps {
  onSubmit: (item: Item) => void;
  onCancel: () => void;
}

export function SubmitForm({ onSubmit, onCancel }: SubmitFormProps) {
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate URL
    try {
      new URL(link);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, link, description })
      });

      if (response.redirected) {
        throw new Error('Session expired. Please refresh and sign in again.');
      }

      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from server');
      }

      const data = JSON.parse(text);
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create item');
      }

      onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="submit-form-overlay" onClick={onCancel}>
      <form className="submit-form" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Share Your Creation</h2>

        {error && (
          <div style={{ color: '#d32f2f', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Awesome Claude Tool"
            maxLength={100}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="link">Link</label>
          <input
            id="link"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://github.com/username/repo"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does it do? What problem does it solve?"
            maxLength={500}
            required
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
