import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { randomUUID } from 'crypto';
import { getContainers } from '../../lib/cosmos';
import { getUser } from '../../lib/auth';

// POST /api/items/{id}/vote - Cast or change vote
app.http('castVote', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'items/{id}/vote',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
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
          return { jsonBody: { message: 'Vote unchanged', upvotes: item.upvotes, downvotes: item.downvotes, userVote: body.vote } };
        }

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

        existingVote.vote = body.vote;
        await votesContainer.item(existingVote.id, itemId).replace(existingVote);
      } else {
        if (body.vote === 1) {
          item.upvotes++;
        } else {
          item.downvotes++;
        }

        await votesContainer.items.create({
          id: randomUUID(),
          itemId,
          userId: user.userId,
          vote: body.vote,
          createdAt: new Date().toISOString()
        });
      }

      await itemsContainer.item(itemId, itemId).replace(item);

      return { jsonBody: { upvotes: item.upvotes, downvotes: item.downvotes, userVote: body.vote } };
    } catch (error: any) {
      context.error('Error in castVote:', error);
      return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
    }
  }
});

// DELETE /api/items/{id}/vote - Remove vote
app.http('removeVote', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'items/{id}/vote',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const user = getUser(request);
      if (!user) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } };
      }

      const itemId = request.params.id;
      const { itemsContainer, votesContainer } = await getContainers();

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

      const { resource: item } = await itemsContainer.item(itemId, itemId).read();
      if (existingVote.vote === 1) {
        item.upvotes--;
      } else {
        item.downvotes--;
      }
      await itemsContainer.item(itemId, itemId).replace(item);

      await votesContainer.item(existingVote.id, itemId).delete();

      return { jsonBody: { upvotes: item.upvotes, downvotes: item.downvotes, userVote: null } };
    } catch (error: any) {
      context.error('Error in removeVote:', error);
      return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
    }
  }
});
