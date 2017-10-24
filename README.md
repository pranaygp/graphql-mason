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

### API

`@mason(path: String, method: String)`

* **path** - The url path that should be mapped to this field. The path may include [paramaters](https://github.com/pillarjs/path-to-regexp#parameters). (**Default**: field name)
* **method** - The HTTP method that this field should respond to. (**Default**: `GET` for `Query` fields, and `POST` for `Mutation` fields)

### Examples

```
type Query {
  user(id: ID): User                  @mason(path: "users/:id")
  tasks(
    id: ID,
    where: TaskInput,
    sort: Sort = ASC,
    skip: Int,
    limit: Int = 20,
    count: Boolean = false
  ): [Task]                           @mason(path: "tasks/:sort/:skip/:limit?")
  task(id: ID): Task                  @mason(path: "tasks/:id")
}

type Mutation {
  createUser(user: UserInput): User   @mason(path: "users")
  deleteUser(id: ID): User            @mason(path: "users/:id", method: "DELETE")
  createTask(task: TaskInput): Task   @mason(path: "tasks")
  deleteTask(id: ID): Task            @mason(path: "task/:id", method: "DELETE")
}
```

## Explanation

Sometimes, you'll want to annotate your schema for GraphQL mason specific things. For instance, if you have a schema that looks like this:

```
type Query {
  users: [User]
}

type Mutation {
  createUser($user: InputUser): User
  deleteUser(id: ID): User
}
```

GraphQL Mason will generate the following endpoints:

* `GET /users`
* `POST /createUser`
* `POST /deleteUser`

But if you want to stick to the conventional REST ideas here, you probably want `POST /createUser` to instead be `POST /users` and you may want `POST /deleteUser` to instead be `DELETE /users/:id`. Doing that is simple with a `@mason` directive:

```
type Query {
  users: [User]
}

type Mutation {
  createUser($user: InputUser): User @mason(path: 'users')
  deleteUser(id: ID): User @mason(path: "users/:id", method: "DELETE")
}
```

and then, GraphQL Mason will generate the following endpoints instead:

* `GET /users`
* `POST /users`
* `DELETE /users/:id`