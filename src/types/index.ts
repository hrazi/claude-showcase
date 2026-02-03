export interface User {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
}

export interface AuthInfo {
  clientPrincipal: User | null;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  link: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  userVote?: number; // 1, -1, or undefined
}

export interface Comment {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Vote {
  vote: 1 | -1;
}
