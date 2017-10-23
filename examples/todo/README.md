# Todo List example

The schema and resolvers are defined withing index.js

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