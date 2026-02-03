import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { randomUUID } from 'crypto';
import { getContainers } from '../../lib/cosmos';
import { getUser } from '../../lib/auth';

// GET /api/items/{id}/comments - List comments for an item
app.http('getComments', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'items/{id}/comments',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const itemId = request.params.id;
      const { commentsContainer } = await getContainers();

      const { resources: comments } = await commentsContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.itemId = @itemId ORDER BY c.createdAt ASC',
          parameters: [{ name: '@itemId', value: itemId }]
        })
        .fetchAll();

      return { jsonBody: comments };
    } catch (error: any) {
      context.error('Error in getComments:', error);
      return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
    }
  }
});

// POST /api/items/{id}/comments - Add comment
app.http('createComment', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'items/{id}/comments',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const user = getUser(request);
      if (!user) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } };
      }

      const itemId = request.params.id;
      const body = await request.json() as { text: string };

      if (!body.text || body.text.trim().length === 0) {
        return { status: 400, jsonBody: { error: 'Comment text is required' } };
      }

      const { itemsContainer, commentsContainer } = await getContainers();

      const { resource: item } = await itemsContainer.item(itemId, itemId).read();
      if (!item) {
        return { status: 404, jsonBody: { error: 'Item not found' } };
      }

      const comment = {
        id: randomUUID(),
        itemId,
        userId: user.userId,
        userName: user.userDetails,
        text: body.text.slice(0, 1000),
        createdAt: new Date().toISOString()
      };

      await commentsContainer.items.create(comment);

      item.commentCount = (item.commentCount || 0) + 1;
      await itemsContainer.item(itemId, itemId).replace(item);

      return { status: 201, jsonBody: comment };
    } catch (error: any) {
      context.error('Error in createComment:', error);
      return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
    }
  }
});

// DELETE /api/comments/{id} - Delete own comment
app.http('deleteComment', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'comments/{id}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const user = getUser(request);
      if (!user) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } };
      }

      const commentId = request.params.id;
      const { itemsContainer, commentsContainer } = await getContainers();

      const { resources: comments } = await commentsContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: commentId }]
        })
        .fetchAll();

      const comment = comments[0];
      if (!comment) {
        return { status: 404, jsonBody: { error: 'Comment not found' } };
      }
      if (comment.userId !== user.userId) {
        return { status: 403, jsonBody: { error: 'Not authorized to delete this comment' } };
      }

      await commentsContainer.item(commentId, comment.itemId).delete();

      const { resource: item } = await itemsContainer.item(comment.itemId, comment.itemId).read();
      if (item) {
        item.commentCount = Math.max(0, (item.commentCount || 1) - 1);
        await itemsContainer.item(comment.itemId, comment.itemId).replace(item);
      }

      return { status: 204 };
    } catch (error: any) {
      context.error('Error in deleteComment:', error);
      return { status: 500, jsonBody: { error: error.message || 'Internal server error' } };
    }
  }
});
