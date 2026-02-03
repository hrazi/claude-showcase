import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getContainers } from '../../lib/cosmos';
import { getUser } from '../../lib/auth';
import { v4 as uuidv4 } from 'uuid';

// GET /api/items - List all items sorted by net votes
app.http('getItems', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'items',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const user = getUser(request);
    const { itemsContainer, votesContainer } = await getContainers();

    const { resources: items } = await itemsContainer.items
      .query('SELECT * FROM c ORDER BY (c.upvotes - c.downvotes) DESC')
      .fetchAll();

    // If user is logged in, fetch their votes
    let userVotes: Record<string, number> = {};
    if (user) {
      const { resources: votes } = await votesContainer.items
        .query({
          query: 'SELECT c.itemId, c.vote FROM c WHERE c.userId = @userId',
          parameters: [{ name: '@userId', value: user.userId }]
        })
        .fetchAll();
      userVotes = Object.fromEntries(votes.map((v: any) => [v.itemId, v.vote]));
    }

    const itemsWithVotes = items.map((item: any) => ({
      ...item,
      userVote: userVotes[item.id]
    }));

    return { jsonBody: itemsWithVotes };
  }
});

// POST /api/items - Create new item
app.http('createItem', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'items',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const user = getUser(request);
    if (!user) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } };
    }

    const body = await request.json() as { title: string; description: string; link: string };

    if (!body.title || !body.description || !body.link) {
      return { status: 400, jsonBody: { error: 'Missing required fields' } };
    }

    const { itemsContainer } = await getContainers();

    const item = {
      id: uuidv4(),
      title: body.title.slice(0, 100),
      description: body.description.slice(0, 500),
      link: body.link,
      authorId: user.userId,
      authorName: user.userDetails,
      createdAt: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
      commentCount: 0
    };

    await itemsContainer.items.create(item);
    return { status: 201, jsonBody: item };
  }
});

// DELETE /api/items/{id} - Delete own item
app.http('deleteItem', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'items/{id}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const user = getUser(request);
    if (!user) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } };
    }

    const id = request.params.id;
    const { itemsContainer, votesContainer, commentsContainer } = await getContainers();

    // Check ownership
    const { resource: item } = await itemsContainer.item(id, id).read();
    if (!item) {
      return { status: 404, jsonBody: { error: 'Item not found' } };
    }
    if (item.authorId !== user.userId) {
      return { status: 403, jsonBody: { error: 'Not authorized to delete this item' } };
    }

    // Delete item, its votes, and comments
    await itemsContainer.item(id, id).delete();

    // Delete associated votes
    const { resources: votes } = await votesContainer.items
      .query({ query: 'SELECT * FROM c WHERE c.itemId = @itemId', parameters: [{ name: '@itemId', value: id }] })
      .fetchAll();
    for (const vote of votes) {
      await votesContainer.item(vote.id, id).delete();
    }

    // Delete associated comments
    const { resources: comments } = await commentsContainer.items
      .query({ query: 'SELECT * FROM c WHERE c.itemId = @itemId', parameters: [{ name: '@itemId', value: id }] })
      .fetchAll();
    for (const comment of comments) {
      await commentsContainer.item(comment.id, id).delete();
    }

    return { status: 204 };
  }
});
