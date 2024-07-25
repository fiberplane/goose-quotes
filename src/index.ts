import { Hono } from 'hono'

import { createHonoMiddleware } from '@fiberplane/hono';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { asc, eq, ilike } from 'drizzle-orm';

import { geese } from './db/schema';
import { upgradeWebSocket } from 'hono/cloudflare-workers';

const app = new Hono()
app.use(createHonoMiddleware(app));

/**
 * Home page
 * 
 * If `shouldHonk` query parameter is present, then print "Honk honk!"
 */
app.get('/', (c) => {
  const { shouldHonk } = c.req.query();
  const honk = typeof shouldHonk !== "undefined" ? 'Honk honk!' : '';
  return c.text(`Hello Goose Quotes! ${honk}`.trim())
})

/**
 * Search Geese by name
 * 
 * If `name` query parameter is not defined, then return all geese
 */
app.get('/api/geese', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const name = c.req.query("name");

  if (!name) {
    return c.json(await db.select().from(geese))
  }

  const searchResults = await db.select().from(geese)
    .where(ilike(geese.name, `%${name}%`))
    .orderBy(asc(geese.name));

  return c.json(searchResults);
})

/**
 * Create a Goose and return the Goose
 * 
 * Only requires a `name` parameter in the request body
 */
app.post('/api/geese', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const { name, isFlockLeader, programmingLanguage, motivations, location } = await c.req.json()
  const description = `A person named ${name} who talks like a Goose`

  const created = await db.insert(geese).values({ name, description, isFlockLeader, programmingLanguage, motivations, location }).returning({
    id: geese.id,
    name: geese.name,
    description: geese.description,
    isFlockLeader: geese.isFlockLeader,
    programmingLanguage: geese.programmingLanguage,
    motivations: geese.motivations,
    location: geese.location
  });
  return c.json(created?.[0]);
})

/**
 * Get all Geese that are flock leaders
 * Make sure this route is above the `/api/geese/:id` route so that the flock leader is not treated as an id
 */
app.get('/api/geese/flock-leaders', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const flockLeaders = await db.select().from(geese).where(eq(geese.isFlockLeader, true));

  return c.json(flockLeaders);
});

/**
 * Get a Goose by id
 */
app.get('/api/geese/:id', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const id = c.req.param('id');

  const goose = (await db.select().from(geese).where(eq(geese.id, +id)))?.[0];

  if (!goose) {
    return c.json({ message: 'Goose not found' }, 404);
  }

  return c.json(goose);
});

/**
 * Honk at a Goose by id
 */
app.post('/api/geese/:id/honk', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const id = c.req.param('id');
  const goose = (await db.select().from(geese).where(eq(geese.id, +id)))?.[0];

  if (!goose) {
    return c.json({ message: 'Goose not found' }, 404);
  }

  return c.json({ message: `Honk honk! ${goose.name} honks back at you!` });
});

/**
 * Update a Goose by id
 */
app.patch('/api/geese/:id', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const id = c.req.param('id');
  const { name } = await c.req.json()

  const goose = (await db.update(geese).set({ name }).where(eq(geese.id, +id)).returning())?.[0];

  if (!goose) {
    return c.json({ message: 'Goose not found' }, 404);
  }

  return c.json(goose);
});


/**
 * Get Geese by programming language
 */
app.get('/api/geese/language/:language', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const language = c.req.param('language');

  const geeseByLanguage = await db.select().from(geese).where(ilike(geese.programmingLanguage, `%${language}%`));

  return c.json(geeseByLanguage);
});

/**
 * Update a Goose's motivations by id
 */
app.patch('/api/geese/:id/motivations', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const id = c.req.param('id');
  const { motivations } = await c.req.json();

  const updatedGoose = (await db.update(geese)
    .set({ motivations })
    .where(eq(geese.id, +id))
    .returning())?.[0];

  if (!updatedGoose) {
    return c.json({ message: 'Goose not found' }, 404);
  }

  return c.json(updatedGoose);
});


app.get(
  '/ws',
  upgradeWebSocket((c) => {
    return {
      onMessage(event, ws) {
        const { type, payload } = JSON.parse(event.data)
        const sql = neon(c.env.DATABASE_URL)
        const db = drizzle(sql)

        switch (type) {
          case 'GET_GEESE':
            db.select().from(geese).then((geese) => {
              ws.send(JSON.stringify({ type: 'GEESE', payload: geese }))
            })
            break
          case 'CREATE_GOOSE':
            const { name, isFlockLeader, programmingLanguage, motivations, location } = payload
            const description = `A person named ${name} who talks like a Goose`

            db.insert(geese)
              .values({ name, description, isFlockLeader, programmingLanguage, motivations, location })
              .returning({
                id: geese.id,
                name: geese.name,
                description: geese.description,
                isFlockLeader: geese.isFlockLeader,
                programmingLanguage: geese.programmingLanguage,
                motivations: geese.motivations,
                location: geese.location,
              })
              .then((newGoose) => {
                ws.send(JSON.stringify({ type: 'NEW_GOOSE', payload: newGoose[0] }))
              })
            break
          // ... (handle other message types)
          default:
            break
        }
      },
      onClose: () => {
        console.log('Connection closed')
      },
    }
  })
)

export default app