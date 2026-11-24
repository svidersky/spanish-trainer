// Cloudflare entry point: the HTTP API (router.js) and the Durable Object class that keeps one
// Profile (profile.js). Only this file imports from "cloudflare:workers"; the logic lives in
// plain modules that the Node tests load directly.
import { DurableObject } from 'cloudflare:workers';
import { route } from './router.js';
import { ProfileLogic } from './profile.js';

export class ProfileStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.logic = new ProfileLogic(ctx);
  }

  async fetch(request) {
    return this.logic.fetch(request);
  }
}

export default { fetch: route };
