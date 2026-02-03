import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { ItemList } from './components/ItemList';
import { SubmitForm } from './components/SubmitForm';
import { Item } from './types';

function App() {
  const { user, loading, login, logout } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      setFetchError(null);
      const response = await fetch('/api/items', {
        credentials: 'include'
      });

      if (response.redirected) {
        // User not logged in, that's ok - show empty state
        setItems([]);
        return;
      }

      const text = await response.text();
      if (!text) {
        setFetchError('Empty response from API');
        return;
      }

      const data = JSON.parse(text);
      if (!response.ok) {
        setFetchError(data.error || `API error: ${response.status}`);
        return;
      }

      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setFetchError('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to load items');
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleItemCreated = (newItem: Item) => {
    setItems([newItem, ...items]);
    setShowSubmitForm(false);
  };

  const handleVoteChange = (itemId: string, upvotes: number, downvotes: number, userVote?: number) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, upvotes, downvotes, userVote } : item
    ).sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)));
  };

  const handleCommentCountChange = (itemId: string, commentCount: number) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, commentCount } : item
    ));
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <Header
        user={user}
        onLogin={login}
        onLogout={logout}
        onSubmitClick={() => setShowSubmitForm(true)}
      />
      <main className="main">
        {showSubmitForm && user && (
          <SubmitForm
            onSubmit={handleItemCreated}
            onCancel={() => setShowSubmitForm(false)}
          />
        )}
        {loadingItems ? (
          <div className="loading">Loading items...</div>
        ) : fetchError ? (
          <div className="error-state" style={{ padding: '2rem', textAlign: 'center', color: '#d32f2f' }}>
            <h2>Failed to load items</h2>
            <p>{fetchError}</p>
            <button className="btn btn-primary" onClick={fetchItems}>Try Again</button>
          </div>
        ) : (
          <ItemList
            items={items}
            user={user}
            onVoteChange={handleVoteChange}
            onCommentCountChange={handleCommentCountChange}
          />
        )}
      </main>
    </div>
  );
}

export default App;
