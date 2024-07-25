# Goose Quotes API

Harnessing the power of AI to imagine the world in a goosier way.

This API provides a collection of inspirational quotes from the wise and charismatic Goose.
It is a basic CRUD API that is used to power the [Goose Quotes](https://goose-quotes.honc.dev/) website.

It is powered by the [HONC kit](https://honc.dev), consisting of [Hono](https://hono.dev/) for the API, [Neon](https://neon.tech/) for the database, and [Drizzle](https://orm.drizzle.team/) for the ORM. It runs on [CloudFlare Workers](https://developers.cloudflare.com/workers/).

The repo also a good example of how to use [FPX](https://fiberplane.com/) build, test and debug an Hono API.

## Requirements:

Besides the requirements specified in the `package.json` you will need a Postgres database and the `DATABASE_URL` environment variable set. We recommend using [Neon](https://neon.tech/) for a Postgres database, but any other Postgres database should do the trick, as well as running one locally.

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
npm run db:generate
npm run db:migrate
```

5. Start the development server:

```bash
yarn dev
```

The API will be running at `http://localhost:8787` and spin up a local CloudFlare Worker.


## Running FPX Studio to debug your API

```bash
npx @fiberplane/studio
```


## Deploy the Goose Quotes API

```bash
yarn run deploy
```

## Endpoints

### `GET /quotes`

Retrieve a random quote from Goose.

### `GET /quotes/random`

Retrieve a random quote from Goose.

### `GET /quotes/:id`

Retrieve a specific quote by its ID.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).