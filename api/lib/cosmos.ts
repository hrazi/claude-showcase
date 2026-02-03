import { CosmosClient, Database, Container } from '@azure/cosmos';

const endpoint = process.env.COSMOS_ENDPOINT || '';
const key = process.env.COSMOS_KEY || '';
const databaseId = 'claude-showcase';

let client: CosmosClient;
let database: Database;
let itemsContainer: Container;
let votesContainer: Container;
let commentsContainer: Container;

export async function getContainers() {
  if (!client) {
    client = new CosmosClient({ endpoint, key });
    database = client.database(databaseId);
    itemsContainer = database.container('items');
    votesContainer = database.container('votes');
    commentsContainer = database.container('comments');
  }
  return { itemsContainer, votesContainer, commentsContainer };
}
