import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getContainers } from '../../lib/cosmos';
import { getUser } from '../../lib/auth';
import { v4 as uuidv4 } from 'uuid';

// POST /api/items/{id}/vote - Cast or change vote
app.http('castVote', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'items/{id}/vote',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const user = getUser(request);
    if (!user) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } };
    }

    const itemId = request.params.id;
    const body = await request.json() as { vote: number };

    if (body.vote !== 1 && body.vote !== -1) {
      return { status: 400, jsonBody: { error: 'Vote must be 1 or -1' } };
    }

    const { itemsContainer, votesContainer } = await getContainers();

    // Check item exists
    const { resource: item } = await itemsContainer.item(itemId, itemId).read();
    if (!item) {
      return { status: 404, jsonBody: { error: 'Item not found' } };
    }

    // Check for existing vote
    const { resources: existingVotes } = await votesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.itemId = @itemId AND c.userId = @userId',
        parameters: [
          { name: '@itemId', value: itemId },
          { name: '@userId', value: user.userId }
        ]
      })
      .fetchAll();

    const existingVote = existingVotes[0];

    if (existingVote) {
      if (existingVote.vote === body.vote) {
        // Same vote, no-op
        return { jsonBody: { message: 'Vote unchanged' } };
      }

      // Change vote: update counts
      if (existingVote.vote === 1) {
        item.upvotes--;
      } else {
        item.downvotes--;
      }

      if (body.vote === 1) {
        item.upvotes++;
      } else {
        item.downvotes++;
      }

      // Update vote record
      existingVote.vote = body.vote;
      await votesContainer.item(existingVote.id, itemId).replace(existingVote);
    } else {
      // New vote
      if (body.vote === 1) {
        item.upvotes++;
      } else {
        item.downvotes++;
      }

      await votesContainer.items.create({
        id: uuidv4(),
        itemId,
        userId: user.userId,
        vote: body.vote,
        createdAt: new Date().toISOString()
      });
    }

    // Update item counts
    await itemsContainer.item(itemId, itemId).replace(item);

    return { jsonBody: { upvotes: item.upvotes, downvotes: item.downvotes, userVote: body.vote } };
  }
});

// DELETE /api/items/{id}/vote - Remove vote
app.http('removeVote', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'items/{id}/vote',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const user = getUser(request);
    if (!user) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } };
    }

    const itemId = request.params.id;
    const { itemsContainer, votesContainer } = await getContainers();

    // Find existing vote
    const { resources: existingVotes } = await votesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.itemId = @itemId AND c.userId = @userId',
        parameters: [
          { name: '@itemId', value: itemId },
          { name: '@userId', value: user.userId }
        ]
      })
      .fetchAll();

    const existingVote = existingVotes[0];
    if (!existingVote) {
      return { status: 404, jsonBody: { error: 'No vote to remove' } };
    }

    // Update item counts
    const { resource: item } = await itemsContainer.item(itemId, itemId).read();
    if (existingVote.vote === 1) {
      item.upvotes--;
    } else {
      item.downvotes--;
    }
    await itemsContainer.item(itemId, itemId).replace(item);

    // Delete vote
    await votesContainer.item(existingVote.id, itemId).delete();

    return { jsonBody: { upvotes: item.upvotes, downvotes: item.downvotes, userVote: null } };
  }
});
