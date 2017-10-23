# GraphQL Mason

express middleware that sets up a REST API from GraphQL schema and resolvers...

...so you can develop your GraphQL API and get the best of both worlds without the extra work :)

## Why REST from GraphQL

GraphQL has  lot of nice benefits (https://graphql.org). However, you may want to retain a traditional REST API too (for backwards/maximum compatibility) or just because you like RESTing (Accepting PRs for a better pun).

## How do I set this up?

If you're already using [express-graphql](https://github.com/graphql/express-graphql), you probably already have a `schema` and a `rootResolver`. You're likely also passing them in like so:

```javascript
app.use('/graphql', graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: true
}));
```

so, how do I now add a bunch of REST API endpoints using GraphQL Mason? Easy.
```javascript
app.use('/api', bodyParser.json()); // To support POST mutations
app.use('/api', graphqlMason({
  schema, 
  rootValue: root
}));
```

You now have a basic REST API that supports the queries and mutations from your schema using the same resolvers from GraphQL.

## The `@mason` directive

Sometimes, you'll want to annotate your schema for GraphQL mason specific things. For instance, if you have a schema that looks like this:

```
type Query {
  users: [User]
}

type Mutation {
  createUser($user: InputUser): User
}
```

GraphQL Mason will generate the following endpoints:

* `GET /users`
* `POST /createUser`

But if you want to stick to the conventional REST ideas here, you probably want `POST /createUser` to instead be `POST /users`. Doing that is simple with a `@mason` directive:

```
type Query {
  users: [User]
}

type Mutation {
  createUser($user: InputUser): User @mason(path: 'users')
}
```

and then, GraphQL Mason will generate the following endpoints instead:

* `GET /users`
* `POST /users`