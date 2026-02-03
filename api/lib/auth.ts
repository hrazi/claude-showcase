import { HttpRequest } from '@azure/functions';

export interface ClientPrincipal {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
}

export function getUser(request: HttpRequest): ClientPrincipal | null {
  const header = request.headers.get('x-ms-client-principal');
  if (!header) return null;

  try {
    const encoded = Buffer.from(header, 'base64');
    const decoded = encoded.toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
