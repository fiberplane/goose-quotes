
![HONC-Git](https://github.com/user-attachments/assets/669c0de6-d7e8-45db-a858-585f895e7d29)

# Goose Quotes API

Harnessing the power of AI to imagine the world in a goosier way.

This API provides a collection of inspirational quotes from the wise and charismatic Goose.
TODO: It is a basic CRUD API that is used for the [Goose Quotes](https://goose-quotes.honc.dev/) website.

It is powered by the [HONC kit](https://honc.dev), consisting of [Hono](https://hono.dev/) for the API, [Neon](https://neon.tech/) for the database, and [Drizzle](https://orm.drizzle.team/) for the ORM. It runs on [CloudFlare Workers](https://developers.cloudflare.com/workers/).

The repo also a good example of how to use [FPX](https://github.com/fiberplane/fpx/) to build, test and debug a Hono API.

## Requirements:

Besides the requirements specified in the `package.json` you will need a Postgres database and the `DATABASE_URL` environment variable set. We recommend using [Neon](https://neon.tech/) for a Postgres database, but any other Postgres database should do the trick, as well as running one locally.

For the generation of quotes and biographies for the geese, you will need an OpenAI API key. You can create one [here](https://platform.openai.com/api-keys).

You can set the OpenAI API key in the `.dev.vars` file or in the `.env` file or within your `wrangler.toml` file.

## Installation

1. Clone the repository:

```bash
git clone https://github.com/fiberplane/goose-quotes-api.git
```

2. Navigate to the project directory:

```bash
cd goose-quotes-api
```

3. Install dependencies:

```bash
yarn install
```

4. Running migrations:

```bash
yarn run db:generate
yarn run db:migrate
```

5. Start the development server:

```bash
yarn dev
```

The API will be running at `http://localhost:8787` and spin up a local CloudFlare Worker.


## Running FPX Studio to debug your API

In order to debug your API, you can use FPX Studio and the Hono middleware.

```bash
yarn add @fiberplane/hono
```

This installs the middleware into your project. Next you must activate it in your `src/index.ts` file.

```ts
import { createHonoMiddleware } from "@fiberplane/hono"

const app = new Hono()

app.use(createHonoMiddleware(app))
```

See the `./src/index.ts` file for the full code.

Next, you can start FPX Studio by running the following command:

```bash
npx @fiberplane/studio
```

Now inspect your routes and generate requests at `http://localhost:8788`.

## Deploy the Goose Quotes API

```bash
yarn run deploy
```

You will need a CloudFlare account to deploy the API. You can create one [here](https://dash.cloudflare.com/sign-up/free-trial?utm_source=honc.dev).

## Endpoints

### GET /

Description: Home page. If the shouldHonk query parameter is present, it responds with “Honk honk!”.

### GET /api/geese

Description: Retrieves all geese. If the name query parameter is defined, it returns geese whose names match the search term.

### POST /api/geese

Description: Creates a new goose. Requires name, and optionally isFlockLeader, programmingLanguage, motivations, and location in the request body.

### POST /api/geese/:id/generate

Description: Generates goose quotes influenced by the specified goose.

### GET /api/geese/flock-leaders

Description: Retrieves all geese that are flock leaders.

### GET /api/geese/:id

Description: Retrieves a goose by its ID.

### POST /api/geese/:id/bio

Description: Generates a bio for the specified goose and updates it.

### POST /api/geese/:id/honk

Description: Sends a honk message to the specified goose by its ID.

### PATCH /api/geese/:id

Description: Updates the name of the specified goose by its ID.

### GET /api/geese/language/:language

Description: Retrieves geese by programming language.

### PATCH /api/geese/:id/motivations

Description: Updates the motivations of the specified goose by its ID.

### GET /ws

Description: WebSocket endpoint for handling various real-time events related to geese, such as retrieving geese and creating a new goose.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
