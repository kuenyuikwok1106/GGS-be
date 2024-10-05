import { ApiVersion, Session, shopifyApi } from "@shopify/shopify-api";
import { RestClient } from "@shopify/shopify-api/dist/ts/lib/clients/admin/rest/client";
import dotenv from 'dotenv';

dotenv.config();

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET_KEY || '',
  scopes: process.env.SHOPIFY_API_ADMIN_ACCESS_TOKEN?.split(". "),
  hostName: 'ggs-sandbox.myshopify.com',
  apiVersion: ApiVersion.July24,
  isEmbeddedApp: true,
});

const sessionId = shopify.session.getOfflineId('ggs-sandbox.myshopify.com');

const session = new Session({
  id: sessionId,
  shop: 'ggs-sandbox.myshopify.com',
  state: 'state',
  isOnline: false,
  accessToken: process.env.SHOPIFY_API_ADMIN_ACCESS_TOKEN
});
const client = new shopify.clients.Graphql({ session });

export default client;
