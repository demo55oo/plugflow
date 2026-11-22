# Plugflow

Open-source workflow automation where the integrations already work. Build a workflow on a canvas, and run any tool from 1,000+ apps through [Composio](https://composio.dev) without registering a single OAuth app.

![Plugflow canvas](docs/screenshot.png)

> **Status: early.** The canvas, the workflow engine and a generic Composio step work today. The tool browser, Composio triggers and the agent step are on the roadmap below.

## Why

Self-hosting an automation tool usually means creating your own OAuth app for every service you want to connect: Google, Slack, GitHub, each with its own console, redirect URLs and review process. Plugflow hands that part to Composio. You connect an account once in Composio, and every workflow can use it.

- **One key, 1,000+ apps.** Add a Composio API key and call any Composio tool from a workflow step.
- **Apache-2.0.** Use it, embed it, host it for others.
- **Runs with no accounts.** An embedded database and anonymous sign-in mean `pnpm dev` works before you have signed up for anything.
- **Real execution.** Triggers, branching, run history and per-step logs, built on the [Workflow DevKit](https://useworkflow.dev).

## Quick start

You need Node.js 20 or newer and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/demo55oo/plugflow.git
cd plugflow
pnpm install
cp .env.example .env.local
```

Fill in the two secrets in `.env.local`:

```bash
openssl rand -base64 32   # paste as BETTER_AUTH_SECRET
openssl rand -hex 32      # paste as INTEGRATION_ENCRYPTION_KEY
```

Start the embedded database in one terminal and leave it running:

```bash
pnpm db:local
```

In a second terminal, create the tables once and start the app:

```bash
pnpm db:push
pnpm dev
```

Open http://localhost:3000. On Windows, use `pnpm dev:webpack` instead of `pnpm dev`.

The embedded database is meant for trying Plugflow out. For anything you depend on, point `DATABASE_URL` at a real Postgres database.

## Connect Composio

1. Create a free account at [platform.composio.dev](https://platform.composio.dev) and copy your API key.
2. In Composio, connect the apps you want to use (for example GitHub and Slack). Note the user ID you connected them under; if you did not choose one, it is `default`.
3. In Plugflow, add a step, choose **Composio > Execute Tool**, and add a connection with your API key when prompted.

Then fill in the step:

| Field | What to enter |
|---|---|
| Tool | The tool's slug from the [Composio toolkit docs](https://docs.composio.dev/toolkits), for example `GITHUB_CREATE_AN_ISSUE` |
| Arguments (JSON) | A JSON object of the tool's inputs. Use `{{` to insert values from earlier steps |
| User ID | Leave empty unless one workflow acts for several Composio users |

The step returns `data` (whatever the tool returned) and `logId` (the Composio execution log, useful when a call fails).

## Where each key goes

| Key | Where to get it | Where it goes |
|---|---|---|
| Composio API key | [platform.composio.dev](https://platform.composio.dev) | In the app, on the Composio connection. Stored encrypted in your database |
| `DATABASE_URL` | Nothing to get for local use; the default in `.env.example` points at `pnpm db:local`. For production, any Postgres provider | `.env.local` |
| `BETTER_AUTH_SECRET` | Generate it yourself | `.env.local` |
| `INTEGRATION_ENCRYPTION_KEY` | Generate it yourself | `.env.local` |
| `AI_GATEWAY_API_KEY` | Optional, from [Vercel AI Gateway](https://vercel.com/ai-gateway). Only for the AI steps | `.env.local` |

## Templates

Starter workflows live in [`templates/`](templates). The first one, `github-issue-to-slack.json`, takes a webhook, fetches a GitHub issue and posts it to Slack, with both steps running through Composio.

## Roadmap

- Tool browser: pick an app and a tool from a list, with a form generated from the tool's input schema, instead of typing a slug and JSON
- Connect apps from inside Plugflow
- Composio triggers (new email, new issue, new message) as workflow triggers
- Agent step that can choose among Composio tools
- One-click template import
- Docker image

## Contributing

Issues and pull requests are welcome. Good places to start are new templates, new step types, and anything on the roadmap. Before opening a pull request, run:

```bash
pnpm type-check
pnpm fix
```

## Credits and license

Plugflow is licensed under [Apache-2.0](LICENSE). It is based on Vercel's [Workflow Builder Template](https://github.com/vercel-labs/workflow-builder-template); see [NOTICE](NOTICE). The canvas design is by Salaheddine Fikri.

Plugflow is an independent project and is not affiliated with Vercel or Composio.
