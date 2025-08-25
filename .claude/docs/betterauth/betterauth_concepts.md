# concepts: API
URL: /docs/concepts/api
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/api.mdx

Better Auth API.

***

title: API
description: Better Auth API.
-----------------------------

When you create a new Better Auth instance, it provides you with an `api` object. This object exposes every endpoint that exist in your Better Auth instance. And you can use this to interact with Better Auth server side.

Any endpoint added to Better Auth, whether from plugins or the core, will be accessible through the `api` object.

## Calling API Endpoints on the Server

To call an API endpoint on the server, import your `auth` instance and call the endpoint using the `api` object.

```ts title="server.ts"
import { betterAuth } from "better-auth";
import { headers } from "next/headers";

export const auth = betterAuth({
    //...
})

// calling get session on the server
await auth.api.getSession({
    headers: await headers() // some endpoint might require headers
})
```

### Body, Headers, Query

Unlike the client, the server needs the values to be passed as an object with the key `body` for the body, `headers` for the headers, and `query` for query parameters.

```ts title="server.ts"
await auth.api.getSession({
    headers: await headers()
})

await auth.api.signInEmail({
    body: {
        email: "john@doe.com",
        password: "password"
    },
    headers: await headers() // optional but would be useful to get the user IP, user agent, etc.
})

await auth.api.verifyEmail({
    query: {
        token: "my_token"
    }
})
```

<Callout>
  Better auth API endpoints are built on top of [better-call](https://github.com/bekacru/better-call), a tiny web framework that lets you call REST API endpoints as if they were regular functions and allows us to easily infer client types from the server.
</Callout>

### Getting `headers` and `Response` Object

When you invoke an API endpoint on the server, it will return a standard JavaScript object or array directly as it's just a regular function call.

But there are times where you might want to get the `headers` or the `Response` object instead. For example, if you need to get the cookies or the headers.

#### Getting `headers`

To get the `headers`, you can pass the `returnHeaders` option to the endpoint.

```ts
const { headers, response } = await auth.api.signUpEmail({
	returnHeaders: true,
	body: {
		email: "john@doe.com",
		password: "password",
		name: "John Doe",
	},
});
```

The `headers` will be a `Headers` object. Which you can use to get the cookies or the headers.

```ts
const cookies = headers.get("set-cookie");
const headers = headers.get("x-custom-header");
```

#### Getting `Response` Object

To get the `Response` object, you can pass the `asResponse` option to the endpoint.

```ts title="server.ts"
const response = await auth.api.signInEmail({
    body: {
        email: "",
        password: ""
    },
    asResponse: true
})
```

### Error Handling

When you call an API endpoint in the server, it will throw an error if the request fails. You can catch the error and handle it as you see fit. The error instance is an instance of `APIError`.

```ts title="server.ts"
import { APIError } from "better-auth/api";

try {
    await auth.api.signInEmail({
        body: {
            email: "",
            password: ""
        }
    })
} catch (error) {
    if (error instanceof APIError) {
        console.log(error.message, error.status)
    }
}
```

# concepts: CLI
URL: /docs/concepts/cli
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/cli.mdx

Built-in CLI for managing your project.

***

title: CLI
description: Built-in CLI for managing your project.
----------------------------------------------------

Better Auth comes with a built-in CLI to help you manage the database schemas, initialize your project, and generate a secret key for your application.

## Generate

The `generate` command creates the schema required by Better Auth. If you're using a database adapter like Prisma or Drizzle, this command will generate the right schema for your ORM. If you're using the built-in Kysely adapter, it will generate an SQL file you can run directly on your database.

```bash title="Terminal"
npx @better-auth/cli@latest generate
```

### Options

* `--output` - Where to save the generated schema. For Prisma, it will be saved in prisma/schema.prisma. For Drizzle, it goes to schema.ts in your project root. For Kysely, it’s an SQL file saved as schema.sql in your project root.
* `--config` - The path to your Better Auth config file. By default, the CLI will search for a auth.ts file in **./**, **./utils**, **./lib**, or any of these directories under `src` directory.
* `--yes` - Skip the confirmation prompt and generate the schema directly.

## Migrate

The migrate command applies the Better Auth schema directly to your database. This is available if you’re using the built-in Kysely adapter. For other adapters, you'll need to apply the schema using your ORM's migration tool.

```bash title="Terminal"
npx @better-auth/cli@latest migrate
```

### Options

* `--config` - The path to your Better Auth config file. By default, the CLI will search for a auth.ts file in **./**, **./utils**, **./lib**, or any of these directories under `src` directory.
* `--yes` - Skip the confirmation prompt and apply the schema directly.

## Init

The `init` command allows you to initialize Better Auth in your project.

```bash title="Terminal"
npx @better-auth/cli@latest init
```

### Options

* `--name` - The name of your application. (Defaults to your `package.json`'s `name` property.)
* `--framework` - The framework your codebase is using. Currently, the only supported framework is `nextjs`.
* `--plugins` - The plugins you want to use. You can specify multiple plugins by separating them with a comma.
* `--database` - The database you want to use. Currently, the only supported database is `sqlite`.
* `--package-manager` - The package manager you want to use. Currently, the only supported package managers are `npm`, `pnpm`, `yarn`, `bun`. (Defaults to the manager you used to initialize the CLI.)

## Secret

The CLI also provides a way to generate a secret key for your Better Auth instance.

```bash title="Terminal"
npx @better-auth/cli@latest secret
```

## Common Issues

**Error: Cannot find module X**

If you see this error, it means the CLI can’t resolve imported modules in your Better Auth config file. We're working on a fix for many of these issues, but in the meantime, you can try the following:

* Remove any import aliases in your config file and use relative paths instead. After running the CLI, you can revert to using aliases.

# concepts: Client
URL: /docs/concepts/client
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/client.mdx

Better Auth client library for authentication.

***

title: Client
description: Better Auth client library for authentication.
-----------------------------------------------------------

Better Auth offers a client library compatible with popular frontend frameworks like React, Vue, Svelte, and more. This client library includes a set of functions for interacting with the Better Auth server. Each framework's client library is built on top of a core client library that is framework-agnostic, so that all methods and hooks are consistently available across all client libraries.

## Installation

If you haven't already, install better-auth.

<Tabs items={}>
  <Tab value="npm">
    ```bash
    npm i better-auth
    ```
  </Tab>

  <Tab value="pnpm">
    ```bash
    pnpm add better-auth
    ```
  </Tab>

  <Tab value="yarn">
    ```bash
    yarn add better-auth
    ```
  </Tab>

  <Tab value="bun">
    ```bash
    bun add better-auth
    ```
  </Tab>
</Tabs>

## Create Client Instance

Import `createAuthClient` from the package for your framework (e.g., "better-auth/react" for React). Call the function to create your client. Pass the base URL of your auth server. If the auth server is running on the same domain as your client, you can skip this step.

<Callout type="info">
  If you're using a different base path other than `/api/auth`, make sure to pass the whole URL, including the path. (e.g., `http://localhost:3000/custom-path/auth`)
</Callout>

<Tabs
  items={["react", "vue", "svelte", "solid",
"vanilla"]}
  defaultValue="react"
>
  <Tab value="vanilla">
    ```ts title="lib/auth-client.ts"
    import { createAuthClient } from "better-auth/client"
    export const authClient = createAuthClient({
        baseURL: "http://localhost:3000" // The base URL of your auth server // [!code highlight]
    })
    ```
  </Tab>

  <Tab value="react" title="lib/auth-client.ts">
    ```ts title="lib/auth-client.ts"
    import { createAuthClient } from "better-auth/react"
    export const authClient = createAuthClient({
        baseURL: "http://localhost:3000" // The base URL of your auth server // [!code highlight]
    })
    ```
  </Tab>

  <Tab value="vue" title="lib/auth-client.ts">
    ```ts title="lib/auth-client.ts"
    import { createAuthClient } from "better-auth/vue"
    export const authClient = createAuthClient({
        baseURL: "http://localhost:3000" // The base URL of your auth server // [!code highlight]
    })
    ```
  </Tab>

  <Tab value="svelte" title="lib/auth-client.ts">
    ```ts title="lib/auth-client.ts"
    import { createAuthClient } from "better-auth/svelte"
    export const authClient = createAuthClient({
        baseURL: "http://localhost:3000" // The base URL of your auth server // [!code highlight]
    })
    ```
  </Tab>

  <Tab value="solid" title="lib/auth-client.ts">
    ```ts title="lib/auth-client.ts"
    import { createAuthClient } from "better-auth/solid"
    export const authClient = createAuthClient({
        baseURL: "http://localhost:3000" // The base URL of your auth server // [!code highlight]
    })
    ```
  </Tab>
</Tabs>

## Usage

Once you've created your client instance, you can use the client to interact with the Better Auth server. The client provides a set of functions by default and they can be extended with plugins.

**Example: Sign In**

```ts title="auth-client.ts"
import { createAuthClient } from "better-auth/client"
const authClient = createAuthClient()

await authClient.signIn.email({
    email: "test@user.com",
    password: "password1234"
})
```

### Hooks

On top of normal methods, the client provides hooks to easily access different reactive data. Every hook is available in the root object of the client and they all start with `use`.

**Example: useSession**

<Tabs items={["React", "Vue","Svelte", "Solid"]} defaultValue="React">
  <Tab value="React">
    ```tsx title="user.tsx"
    //make sure you're using the react client
    import { createAuthClient } from "better-auth/react"
    const { useSession } = createAuthClient() // [!code highlight]

    export function User() {
        const {
            data: session,
            isPending, //loading state
            error, //error object
            refetch //refetch the session
        } = useSession()
        return (
            //...
        )
    }
    ```
  </Tab>

  <Tab value="Vue">
    ```vue title="user.vue"
    <script lang="ts" setup>
    import { authClient } from '@/lib/auth-client'
    const session = authClient.useSession()
    </script>
    <template>
        <div>
            <button v-if="!session.data" @click="() => authClient.signIn.social({
                provider: 'github'
            })">
                Continue with GitHub
            </button>
            <div>
                <pre>{{ session.data }}</pre>
                <button v-if="session.data" @click="authClient.signOut()">
                    Sign out
                </button>
            </div>
        </div>
    </template>
    ```
  </Tab>

  <Tab value="Svelte">
    ```svelte title="user.svelte"
    <script lang="ts">
    import { client } from "$lib/client";
    const session = client.useSession();
    </script>

    <div
        style="display: flex; flex-direction: column; gap: 10px; border-radius: 10px; border: 1px solid #4B453F; padding: 20px; margin-top: 10px;"
    >
        <div>
        {#if $session}
            <div>
            <p>
                {$session?.data?.user.name}
            </p>
            <p>
                {$session?.data?.user.email}
            </p>
            <button
                on:click={async () => {
                await authClient.signOut();
                }}
            >
                Signout
            </button>
            </div>
        {:else}
            <button
            on:click={async () => {
                await authClient.signIn.social({
                provider: "github",
                });
            }}
            >
            Continue with GitHub
            </button>
        {/if}
        </div>
    </div>
    ```
  </Tab>

  <Tab value="Solid">
    ```tsx title="user.tsx"
    import { client } from "~/lib/client";
    import { Show } from 'solid-js';

    export default function Home() {
        const session = client.useSession()
        return (
            <Show
                when={session()}
                fallback={<button onClick={toggle}>Log in</button>}
            >
                <button onClick={toggle}>Log out</button>
            </Show>
        );
    }
    ```
  </Tab>
</Tabs>

### Fetch Options

The client uses a library called [better fetch](https://better-fetch.vercel.app) to make requests to the server.

Better fetch is a wrapper around the native fetch API that provides a more convenient way to make requests. It's created by the same team behind Better Auth and is designed to work seamlessly with it.

You can pass any default fetch options to the client by passing `fetchOptions` object to the `createAuthClient`.

```ts title="auth-client.ts"
import { createAuthClient } from "better-auth/client"

const authClient = createAuthClient({
    fetchOptions: {
        //any better-fetch options
    },
})
```

You can also pass fetch options to most of the client functions. Either as the second argument or as a property in the object.

```ts title="auth-client.ts"
await authClient.signIn.email({
    email: "email@email.com",
    password: "password1234",
}, {
    onSuccess(ctx) {
            //
    }
})

//or

await authClient.signIn.email({
    email: "email@email.com",
    password: "password1234",
    fetchOptions: {
        onSuccess(ctx) {
            //
        }
    },
})
```

### Handling Errors

Most of the client functions return a response object with the following properties:

* `data`: The response data.
* `error`: The error object if there was an error.

the error object contains the following properties:

* `message`: The error message. (e.g., "Invalid email or password")
* `status`: The HTTP status code.
* `statusText`: The HTTP status text.

```ts title="auth-client.ts"
const { data, error } = await authClient.signIn.email({
    email: "email@email.com",
    password: "password1234"
})
if (error) {
    //handle error
}
```

If the actions accepts a `fetchOptions` option, you can pass `onError` callback to handle errors.

```ts title="auth-client.ts"

await authClient.signIn.email({
    email: "email@email.com",
    password: "password1234",
}, {
    onError(ctx) {
        //handle error
    }
})

//or
await authClient.signIn.email({
    email: "email@email.com",
    password: "password1234",
    fetchOptions: {
        onError(ctx) {
            //handle error
        }
    }
})
```

Hooks like `useSession` also return an error object if there was an error fetching the session. On top of that, they also return a `isPending` property to indicate if the request is still pending.

```ts title="auth-client.ts"
const { data, error, isPending } = useSession()
if (error) {
    //handle error
}
```

#### Error Codes

The client instance contains $ERROR\_CODES object that contains all the error codes returned by the server. You can use this to handle error translations or custom error messages.

```ts title="auth-client.ts"
const authClient = createAuthClient();

type ErrorTypes = Partial<
	Record<
		keyof typeof authClient.$ERROR_CODES,
		{
			en: string;
			es: string;
		}
	>
>;

const errorCodes = {
	USER_ALREADY_EXISTS: {
		en: "user already registered",
		es: "usuario ya registrada",
	},
} satisfies ErrorTypes;

const getErrorMessage = (code: string, lang: "en" | "es") => {
	if (code in errorCodes) {
		return errorCodes[code as keyof typeof errorCodes][lang];
	}
	return "";
};


const { error } = await authClient.signUp.email({
	email: "user@email.com",
	password: "password",
	name: "User",
});
if(error?.code){
    alert(getErrorMessage(error.code, "en"));
}
```

### Plugins

You can extend the client with plugins to add more functionality. Plugins can add new functions to the client or modify existing ones.

**Example: Magic Link Plugin**

```ts title="auth-client.ts"
import { createAuthClient } from "better-auth/client"
import { magicLinkClient } from "better-auth/client/plugins"

const authClient = createAuthClient({
    plugins: [
        magicLinkClient()
    ]
})
```

once you've added the plugin, you can use the new functions provided by the plugin.

```ts title="auth-client.ts"
await authClient.signIn.magicLink({
    email: "test@email.com"
})
```

# concepts: Cookies
URL: /docs/concepts/cookies
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/cookies.mdx

Learn how cookies are used in Better Auth.

***

title: Cookies
description: Learn how cookies are used in Better Auth.
-------------------------------------------------------

Cookies are used to store data such as session tokens, OAuth state, and more. All cookies are signed using the `secret` key provided in the auth options.

### Cookie Prefix

Better Auth cookies will follow `${prefix}.${cookie_name}` format by default. The prefix will be "better-auth" by default. You can change the prefix by setting `cookiePrefix` in the `advanced` object of the auth options.

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
    advanced: {
        cookiePrefix: "my-app"
    }
})
```

### Custom Cookies

All cookies are `httpOnly` and `secure` if the server is running in production mode.

If you want to set custom cookie names and attributes, you can do so by setting `cookieOptions` in the `advanced` object of the auth options.

By default, Better Auth uses the following cookies:

* `session_token` to store the session token
* `session_data` to store the session data if cookie cache is enabled
* `dont_remember` to store the `dont_remember` flag if remember me is disabled

Plugins may also use cookies to store data. For example, the Two Factor Authentication plugin uses the `two_factor` cookie to store the two-factor authentication state.

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
    advanced: {
        cookies: {
            session_token: {
                name: "custom_session_token",
                attributes: {
                    // Set custom cookie attributes
                }
            },
        }
    }
})
```

### Cross Subdomain Cookies

Sometimes you may need to share cookies across subdomains. For example, if you have `app.example.com` and `auth.example.com`, and if you authenticate on `auth.example.com`, you may want to access the same session on `app.example.com`.

<Callout type="warn">
  The `domain` attribute controls which domains can access the cookie. Setting it to your root domain (e.g. `example.com`) makes the cookie accessible across all subdomains. For security, you should:

  1. Only enable cross-subdomain cookies if it's necessary
  2. Set the domain to the most specific scope needed (e.g. `app.example.com` instead of `.example.com`)
  3. Be cautious of untrusted subdomains that could potentially access these cookies
  4. Consider using separate domains for untrusted services (e.g. `status.company.com` vs `app.company.com`)
</Callout>

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
    advanced: {
        crossSubDomainCookies: {
            enabled: true,
            domain: "app.example.com", // your domain
        },
    },
    trustedOrigins: [
        'https://example.com',
        'https://app1.example.com',
        'https://app2.example.com',
    ],
})
```

### Secure Cookies

By default, cookies are secure only when the server is running in production mode. You can force cookies to be always secure by setting `useSecureCookies` to `true` in the `advanced` object in the auth options.

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
    advanced: {
        useSecureCookies: true
    }
})
```

# concepts: Database
URL: /docs/concepts/database
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/database.mdx

Learn how to use a database with Better Auth.

***

title: Database
description: Learn how to use a database with Better Auth.
----------------------------------------------------------

## Adapters

Better Auth requires a database connection to store data. The database will be used to store data such as users, sessions, and more. Plugins can also define their own database tables to store data.

You can pass a database connection to Better Auth by passing a supported database instance in the database options. You can learn more about supported database adapters in the [Other relational databases](/docs/adapters/other-relational-databases) documentation.

## CLI

Better Auth comes with a CLI tool to manage database migrations and generate schema.

### Running Migrations

The cli checks your database and prompts you to add missing tables or update existing ones with new columns. This is only supported for the built-in Kysely adapter. For other adapters, you can use the `generate` command to create the schema and handle the migration through your ORM.

```bash
npx @better-auth/cli migrate
```

### Generating Schema

Better Auth also provides a `generate` command to generate the schema required by Better Auth. The `generate` command creates the schema required by Better Auth. If you're using a database adapter like Prisma or Drizzle, this command will generate the right schema for your ORM. If you're using the built-in Kysely adapter, it will generate an SQL file you can run directly on your database.

```bash
npx @better-auth/cli generate
```

See the [CLI](/docs/concepts/cli) documentation for more information on the CLI.

<Callout>
  If you prefer adding tables manually, you can do that as well. The core schema
  required by Better Auth is described below and you can find additional schema
  required by plugins in the plugin documentation.
</Callout>

## Secondary Storage

Secondary storage in Better Auth allows you to use key-value stores for managing session data, rate limiting counters, etc. This can be useful when you want to offload the storage of this intensive records to a high performance storage or even RAM.

### Implementation

To use secondary storage, implement the `SecondaryStorage` interface:

```typescript
interface SecondaryStorage {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
}
```

Then, provide your implementation to the `betterAuth` function:

```typescript
betterAuth({
  // ... other options
  secondaryStorage: {
    // Your implementation here
  },
});
```

**Example: Redis Implementation**

Here's a basic example using Redis:

```typescript
import { createClient } from "redis";
import { betterAuth } from "better-auth";

const redis = createClient();
await redis.connect();

export const auth = betterAuth({
	// ... other options
	secondaryStorage: {
		get: async (key) => {
			const value = await redis.get(key);
			return value ? value : null;
		},
		set: async (key, value, ttl) => {
			if (ttl) await redis.set(key, value, { EX: ttl });
			// or for ioredis:
			// if (ttl) await redis.set(key, value, 'EX', ttl)
			else await redis.set(key, value);
		},
		delete: async (key) => {
			await redis.del(key);
		}
	}
});
```

This implementation allows Better Auth to use Redis for storing session data and rate limiting counters. You can also add prefixes to the keys names.

## Core Schema

Better Auth requires the following tables to be present in the database. The types are in `typescript` format. You can use corresponding types in your database.

### User

Table Name: `user`

<DatabaseTable
  fields={[
  {
    name: "id",
    type: "string",
    description: "Unique identifier for each user",
    isPrimaryKey: true,
  },
  {
    name: "name",
    type: "string",
    description: "User's chosen display name",
  },
  {
    name: "email",
    type: "string",
    description: "User's email address for communication and login",
  },
  {
    name: "emailVerified",
    type: "boolean",
    description: "Whether the user's email is verified",
  },
  {
    name: "image",
    type: "string",
    description: "User's image url",
    isOptional: true,
  },
  {
    name: "createdAt",
    type: "Date",
    description: "Timestamp of when the user account was created",
  },
  {
    name: "updatedAt",
    type: "Date",
    description: "Timestamp of the last update to the user's information",
  },
]}
/>

### Session

Table Name: `session`

<DatabaseTable
  fields={[
  {
    name: "id",
    type: "string",
    description: "Unique identifier for each session",
    isPrimaryKey: true,
  },
  {
    name: "userId",
    type: "string",
    description: "The ID of the user",
    isForeignKey: true,
  },
  {
    name: "token",
    type: "string",
    description: "The unique session token",
    isUnique: true,
  },
  {
    name: "expiresAt",
    type: "Date",
    description: "The time when the session expires",
  },
  {
    name: "ipAddress",
    type: "string",
    description: "The IP address of the device",
    isOptional: true,
  },
  {
    name: "userAgent",
    type: "string",
    description: "The user agent information of the device",
    isOptional: true,
  },
  {
    name: "createdAt",
    type: "Date",
    description: "Timestamp of when the session was created",
  },
  {
    name: "updatedAt",
    type: "Date",
    description: "Timestamp of when the session was updated",
  },
]}
/>

### Account

Table Name: `account`

<DatabaseTable
  fields={[
  {
    name: "id",
    type: "string",
    description: "Unique identifier for each account",
    isPrimaryKey: true,
  },
  {
    name: "userId",
    type: "string",
    description: "The ID of the user",
    isForeignKey: true,
  },
  {
    name: "accountId",
    type: "string",
    description:
      "The ID of the account as provided by the SSO or equal to userId for credential accounts",
  },
  {
    name: "providerId",
    type: "string",
    description: "The ID of the provider",
  },
  {
    name: "accessToken",
    type: "string",
    description: "The access token of the account. Returned by the provider",
    isOptional: true,
  },
  {
    name: "refreshToken",
    type: "string",
    description: "The refresh token of the account. Returned by the provider",
    isOptional: true,
  },
  {
    name: "accessTokenExpiresAt",
    type: "Date",
    description: "The time when the access token expires",
    isOptional: true,
  },
  {
    name: "refreshTokenExpiresAt",
    type: "Date",
    description: "The time when the refresh token expires",
    isOptional: true,
  },
  {
    name: "scope",
    type: "string",
    description: "The scope of the account. Returned by the provider",
    isOptional: true,
  },
  {
    name: "idToken",
    type: "string",
    description: "The ID token returned from the provider",
    isOptional: true,
  },
  {
    name: "password",
    type: "string",
    description:
      "The password of the account. Mainly used for email and password authentication",
    isOptional: true,
  },
  {
    name: "createdAt",
    type: "Date",
    description: "Timestamp of when the account was created",
  },
  {
    name: "updatedAt",
    type: "Date",
    description: "Timestamp of when the account was updated",
  },
]}
/>

### Verification

Table Name: `verification`

<DatabaseTable
  fields={[
  {
    name: "id",
    type: "string",
    description: "Unique identifier for each verification",
    isPrimaryKey: true,
  },
  {
    name: "identifier",
    type: "string",
    description: "The identifier for the verification request",
  },
  {
    name: "value",
    type: "string",
    description: "The value to be verified",
  },
  {
    name: "expiresAt",
    type: "Date",
    description: "The time when the verification request expires",
  },
  {
    name: "createdAt",
    type: "Date",
    description: "Timestamp of when the verification request was created",
  },
  {
    name: "updatedAt",
    type: "Date",
    description: "Timestamp of when the verification request was updated",
  },
]}
/>

## Custom Tables

Better Auth allows you to customize the table names and column names for the core schema. You can also extend the core schema by adding additional fields to the user and session tables.

### Custom Table Names

You can customize the table names and column names for the core schema by using the `modelName` and `fields` properties in your auth config:

```ts title="auth.ts"
export const auth = betterAuth({
  user: {
    modelName: "users",
    fields: {
      name: "full_name",
      email: "email_address",
    },
  },
  session: {
    modelName: "user_sessions",
    fields: {
      userId: "user_id",
    },
  },
});
```

<Callout>
  Type inference in your code will still use the original field names (e.g.,
  `user.name`, not `user.full_name`).
</Callout>

To customize table names and column name for plugins, you can use the `schema` property in the plugin config:

```ts title="auth.ts"
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    twoFactor({
      schema: {
        user: {
          fields: {
            twoFactorEnabled: "two_factor_enabled",
            secret: "two_factor_secret",
          },
        },
      },
    }),
  ],
});
```

### Extending Core Schema

Better Auth provides a type-safe way to extend the `user` and `session` schemas. You can add custom fields to your auth config, and the CLI will automatically update the database schema. These additional fields will be properly inferred in functions like `useSession`, `signUp.email`, and other endpoints that work with user or session objects.

To add custom fields, use the `additionalFields` property in the `user` or `session` object of your auth config. The `additionalFields` object uses field names as keys, with each value being a `FieldAttributes` object containing:

* `type`: The data type of the field (e.g., "string", "number", "boolean").
* `required`: A boolean indicating if the field is mandatory.
* `defaultValue`: The default value for the field (note: this only applies in the JavaScript layer; in the database, the field will be optional).
* `input`: This determines whether a value can be provided when creating a new record (default: `true`). If there are additional fields, like `role`, that should not be provided by the user during signup, you can set this to `false`.

Here's an example of how to extend the user schema with additional fields:

```ts title="auth.ts"
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // don't allow user to set role
      },
      lang: {
        type: "string",
        required: false,
        defaultValue: "en",
      },
    },
  },
});
```

Now you can access the additional fields in your application logic.

```ts
//on signup
const res = await auth.api.signUpEmail({
  email: "test@example.com",
  password: "password",
  name: "John Doe",
  lang: "fr",
});

//user object
res.user.role; // > "admin"
res.user.lang; // > "fr"
```

<Callout>
  See the
  [TypeScript](/docs/concepts/typescript#inferring-additional-fields-on-client)
  documentation for more information on how to infer additional fields on the
  client side.
</Callout>

If you're using social / OAuth providers, you may want to provide `mapProfileToUser` to map the profile data to the user object. So, you can populate additional fields from the provider's profile.

**Example: Mapping Profile to User For `firstName` and `lastName`**

```ts title="auth.ts"
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  socialProviders: {
    github: {
      clientId: "YOUR_GITHUB_CLIENT_ID",
      clientSecret: "YOUR_GITHUB_CLIENT_SECRET",
      mapProfileToUser: (profile) => {
        return {
          firstName: profile.name.split(" ")[0],
          lastName: profile.name.split(" ")[1],
        };
      },
    },
    google: {
      clientId: "YOUR_GOOGLE_CLIENT_ID",
      clientSecret: "YOUR_GOOGLE_CLIENT_SECRET",
      mapProfileToUser: (profile) => {
        return {
          firstName: profile.given_name,
          lastName: profile.family_name,
        };
      },
    },
  },
});
```

### ID Generation

Better Auth by default will generate unique IDs for users, sessions, and other entities. If you want to customize how IDs are generated, you can configure this in the `advanced.database.generateId` option in your auth config.

You can also disable ID generation by setting the `advanced.database.generateId` option to `false`. This will assume your database will generate the ID automatically.

**Example: Automatic Database IDs**

```ts title="auth.ts"
import { betterAuth } from "better-auth";
import { db } from "./db";

export const auth = betterAuth({
  database: {
    db: db,
  },
  advanced: {
    database: {
      generateId: false,
    },
  },
});
```

### Database Hooks

Database hooks allow you to define custom logic that can be executed during the lifecycle of core database operations in Better Auth. You can create hooks for the following models: **user**, **session**, and **account**.

There are two types of hooks you can define:

#### 1. Before Hook

* **Purpose**: This hook is called before the respective entity (user, session, or account) is created or updated.
* **Behavior**: If the hook returns `false`, the operation will be aborted. And If it returns a data object, it'll replace the original payload.

#### 2. After Hook

* **Purpose**: This hook is called after the respective entity is created or updated.
* **Behavior**: You can perform additional actions or modifications after the entity has been successfully created or updated.

**Example Usage**

```typescript title="auth.ts"
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          // Modify the user object before it is created
          return {
            data: {
              ...user,
              firstName: user.name.split(" ")[0],
              lastName: user.name.split(" ")[1],
            },
          };
        },
        after: async (user) => {
          //perform additional actions, like creating a stripe customer
        },
      },
    },
  },
});
```

#### Throwing Errors

If you want to stop the database hook from proceeding, you can throw errors using the `APIError` class imported from `better-auth/api`.

```typescript title="auth.ts"
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";

export const auth = betterAuth({
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          if (user.isAgreedToTerms === false) {
            // Your special condition.
            // Send the API error.
            throw new APIError("BAD_REQUEST", {
              message: "User must agree to the TOS before signing up.",
            });
          }
          return {
            data: user,
          };
        },
      },
    },
  },
});
```

#### Using the Context Object

The context object (`ctx`), passed as the second argument to the hook, contains useful information. For `update` hooks, this includes the current `session`, which you can use to access the logged-in user's details.

```typescript title="auth.ts"
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  databaseHooks: {
    user: {
      update: {
        before: async (data, ctx) => {
          // You can access the session from the context object.
          if (ctx.context.session) {
            console.log("User update initiated by:", ctx.context.session.userId);
          }
          return { data };
        },
      },
    },
  },
});
```

Much like standard hooks, database hooks also provide a `ctx` object that offers a variety of useful properties. Learn more in the [Hooks Documentation](/docs/concepts/hooks#ctx).

## Plugins Schema

Plugins can define their own tables in the database to store additional data. They can also add columns to the core tables to store additional data. For example, the two factor authentication plugin adds the following columns to the `user` table:

* `twoFactorEnabled`: Whether two factor authentication is enabled for the user.
* `twoFactorSecret`: The secret key used to generate TOTP codes.
* `twoFactorBackupCodes`: Encrypted backup codes for account recovery.

To add new tables and columns to your database, you have two options:

`CLI`: Use the migrate or generate command. These commands will scan your database and guide you through adding any missing tables or columns.
`Manual Method`: Follow the instructions in the plugin documentation to manually add tables and columns.

Both methods ensure your database schema stays up to date with your plugins' requirements.

# concepts: Email
URL: /docs/concepts/email
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/email.mdx

Learn how to use email with Better Auth.

***

title: Email
description: Learn how to use email with Better Auth.
-----------------------------------------------------

Email is a key part of Better Auth, required for all users regardless of their authentication method. Better Auth provides email and password authentication out of the box, and a lot of utilities to help you manage email verification, password reset, and more.

## Email Verification

Email verification is a security feature that ensures users provide a valid email address. It helps prevent spam and abuse by confirming that the email address belongs to the user. In this guide, you'll get a walk through of how to implement token based email verification in your app.
To use otp based email verification, check out the [OTP Verification](/docs/plugins/email-otp) guide.

### Adding Email Verification to Your App

To enable email verification, you need to pass a function that sends a verification email with a link.

* **sendVerificationEmail**: This function is triggered when email verification starts. It accepts a data object with the following properties:
  * `user`: The user object containing the email address.
  * `url`: The verification URL the user must click to verify their email.
  * `token`: The verification token used to complete the email verification to be used when implementing a custom verification URL.

and a `request` object as the second parameter.

```ts title="auth.ts"
import { betterAuth } from 'better-auth';
import { sendEmail } from './email'; // your email sending function

export const auth = betterAuth({
    emailVerification: {
        sendVerificationEmail: async ({ user, url, token }, request) => {
            await sendEmail({
                to: user.email,
                subject: 'Verify your email address',
                text: `Click the link to verify your email: ${url}`
            })
        }
    }
})
```

### Triggering Email Verification

You can initiate email verification in several ways:

#### 1. During Sign-up

To automatically send a verification email at signup, set `emailVerification.sendOnSignUp` to `true`.

```ts title="auth.ts"
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
    emailVerification: {
        sendOnSignUp: true
    }
})
```

This sends a verification email when a user signs up. For social logins, email verification status is read from the SSO.

<Callout>
  With `sendOnSignUp` enabled, when the user logs in with an SSO that does not claim the email as verified, Better Auth will dispatch a verification email, but the verification is not required to login even when `requireEmailVerification` is enabled.
</Callout>

#### 2. Require Email Verification

If you enable require email verification, users must verify their email before they can log in. And every time a user tries to sign in, `sendVerificationEmail` is called.

<Callout>
  This only works if you have `sendVerificationEmail` implemented and if the user is trying to sign in with email and password.
</Callout>

```ts title="auth.ts"
export const auth = betterAuth({
    emailAndPassword: {
        requireEmailVerification: true
    }
})
```

if a user tries to sign in without verifying their email, you can handle the error and show a message to the user.

```ts title="auth-client.ts"
await authClient.signIn.email({
    email: "email@example.com",
    password: "password"
}, {
    onError: (ctx) => {
        // Handle the error
        if(ctx.error.status === 403) {
            alert("Please verify your email address")
        }
        //you can also show the original error message
        alert(ctx.error.message)
    }
})
```

#### 3. Manually

You can also manually trigger email verification by calling `sendVerificationEmail`.

```ts
await authClient.sendVerificationEmail({
    email: "user@email.com",
    callbackURL: "/" // The redirect URL after verification
})
```

### Verifying the Email

If the user clicks the provided verification URL, their email is automatically verified, and they are redirected to the `callbackURL`.

For manual verification, you can send the user a custom link with the `token` and call the `verifyEmail` function.

```ts
await authClient.verifyEmail({
    query: {
        token: "" // Pass the token here
    }
})
```

### Auto SignIn After Verification

To sign in the user automatically after they successfully verify their email, set the `autoSignInAfterVerification` option to `true`:

```ts
const auth = betterAuth({
    //...your other options
    emailVerification: {
        autoSignInAfterVerification: true
    }
})
```

### Callback after successful email verification

You can run custom code immediately after a user verifies their email using the `afterEmailVerification` callback. This is useful for any side-effects you want to trigger, like granting access to special features or logging the event.

The `afterEmailVerification` function runs automatically when a user's email is confirmed, receiving the `user` object and `request` details so you can perform actions for that specific user.

Here's how you can set it up:

```ts title="auth.ts"
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
    emailVerification: {
        async afterEmailVerification(user, request) {
            // Your custom logic here, e.g., grant access to premium features
            console.log(`${user.email} has been successfully verified!`);
        }
    }
})
```

## Password Reset Email

Password reset allows users to reset their password if they forget it. Better Auth provides a simple way to implement password reset functionality.

You can enable password reset by passing a function that sends a password reset email with a link.

```ts title="auth.ts"
import { betterAuth } from 'better-auth';
import { sendEmail } from './email'; // your email sending function

export const auth = betterAuth({
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url, token }, request) => {
            await sendEmail({
                to: user.email,
                subject: 'Reset your password',
                text: `Click the link to reset your password: ${url}`
            })
        }
    }
})
```

Check out the [Email and Password](/docs/authentication/email-password#forget-password) guide for more details on how to implement password reset in your app.
Also you can check out the [Otp verification](/docs/plugins/email-otp#reset-password) guide for how to implement password reset with OTP in your app.
