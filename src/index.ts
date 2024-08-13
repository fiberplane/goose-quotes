import { Hono } from 'hono';

import { neon } from '@neondatabase/serverless';
import { asc, eq, ilike } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

import { geese } from './db/schema';

import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { OpenAI } from 'openai';

import { instrument } from '@fiberplane/hono-otel';

type Bindings = {
  DATABASE_URL: string;
  OPENAI_API_KEY: string;
}

const app = new Hono<{ Bindings: Bindings }>()

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
 * Generate Goose Quotes
 */
app.post('/api/geese/:id/generate', async c => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const id = c.req.param('id');

  const goose = (await db.select().from(geese).where(eq(geese.id, +id)))?.[0];

  if (!goose) {
    return c.json({ message: 'Goose not found' }, 404);
  }

  const { name: gooseName } = goose;

  const openaiClient = new OpenAI({
    apiKey: c.env.OPENAI_API_KEY,
    // HACK - OpenAI freezes fetch when it is imported, so our monkey-patched version needs to be passed here
    fetch: globalThis.fetch,
  });

  const response = await openaiClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: trimPrompt(`
            You are a goose. You are a very smart goose. You are part goose, part AI. You are a GooseAI.
            You are also influenced heavily by the work of ${gooseName}.

            Always respond without preamble. If I ask for a list, give me a newline-separated list. That's it.
            Don't number it. Don't bullet it. Just newline it.

            Never forget to Honk. A lot.
        `),
      },
      {
        role: "user",
        content: trimPrompt(`
            Reimagine five famous quotes by ${gooseName}, except with significant goose influence.
        `),
      },
    ],
    temperature: 0.7,
    max_tokens: 2048,
  });

  const quotes = response.choices[0].message.content?.split("\n").filter(quote => quote.length > 0);
  return c.json({ name: goose.name, quotes })
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
 * Generate Goose Bio
 */
app.post('/api/geese/:id/bio', async c => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const id = c.req.param('id');

  const goose = (await db.select().from(geese).where(eq(geese.id, +id)))?.[0];

  if (!goose) {
    return c.json({ message: 'Goose not found' }, 404);
  }

  const { name: gooseName, description, programmingLanguage, motivations, location } = goose;

  const openaiClient = new OpenAI({
    apiKey: c.env.OPENAI_API_KEY,
    fetch: globalThis.fetch,
  });

  const response = await openaiClient.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: trimPrompt(`
            You are a professional bio writer. Your task is to generate a compelling and engaging bio for a goose.
        `),
      },
      {
        role: "user",
        content: trimPrompt(`
            Generate a bio for a goose named ${gooseName} with the following details:
            Description: ${description}
            Programming Language: ${programmingLanguage}
            Motivations: ${motivations}
            Location: ${location}
        `),
      },
    ],
    temperature: 0.7,
    max_tokens: 2048,
  });



  const bio = response.choices[0].message.content;

   // Update the goose with the generated bio
   const updatedGoose = await db.update(geese)
   .set({ bio })
   .where(eq(geese.id, +id))
   .returning();

 return c.json(updatedGoose[0]);

})


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
          case 'CREATE_GOOSE': {
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
          }
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

export default instrument(app)

function trimPrompt(prompt: string) {
  return prompt
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .join("\n");
}
