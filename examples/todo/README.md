# Todo List example

The schema and resolvers are defined within schema.js and resolver.js.

index.js just sets up a simple express app from those

The generated API looks like:

GET /api/users      -> [User]
GET /api/users/:id  -> User
POST /api/users     -> User

GET /api/tasks      -> [Task]
GET /api/tasks/:id  -> Task
POST /api/tasks     -> Task

# Set up

1. `yarn`
2. `yarn start`

# Start [`micro`](https://github.com/zeit/micro) example

**This is still a WIP**

1. `yarn`
2. `yarn run micro`