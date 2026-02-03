import { User } from '../types';

interface HeaderProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onSubmitClick: () => void;
}

export function Header({ user, onLogin, onLogout, onSubmitClick }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <h1>Claude Showcase</h1>
        <span className="tagline">Cool creations from Microsoft engineers</span>
      </div>
      <div className="header-right">
        {user ? (
          <>
            <button className="btn btn-primary" onClick={onSubmitClick}>
              + Submit Creation
            </button>
            <span className="user-name">{user.userDetails}</span>
            <button className="btn btn-secondary" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={onLogin}>
            Sign in with Microsoft
          </button>
        )}
      </div>
    </header>
  );
}
