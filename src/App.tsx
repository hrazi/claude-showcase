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

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
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

  const handleItemDeleted = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
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
        ) : (
          <ItemList
            items={items}
            user={user}
            onVoteChange={handleVoteChange}
            onItemDeleted={handleItemDeleted}
            onCommentCountChange={handleCommentCountChange}
          />
        )}
      </main>
    </div>
  );
}

export default App;
