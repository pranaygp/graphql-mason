const { buildSchema } = require('graphql');

module.exports = buildSchema(`
scalar Date

enum Sort {
  ASC
  DESC
}

type User {
  _id: ID,
  # User name
  name: String,
  # User email
  email: String,
  # Tasks assigned to the user that aren't completed
  pendingTasks: [Task] @mason(path: "tasks")
  # Date the user was created
  dateCreated: Date
}

input UserInput {
  _id: ID,
  name: String,
  email: String,
  dateCreated: Date
}

type Task {
  _id: ID,
  name: String,
  description: String,
  deadline: Date,
  completed: Boolean,
  assignedUser: User,
  assignedUserName: String,
  dateCreated: Date
}

input TaskInput {
  _id: ID,
  name: String,
  description: String,
  deadline: Date,
  completed: Boolean,
  assignedUser: ID,
  assignedUserName: String,
  dateCreated: Date
}

type Query {
  # Fetch users
  users(id: ID, where: UserInput, sort: Sort = ASC, skip: Int, limit: Int = 20, count: Boolean = false): [User],
  # Fetch tasks
  tasks(id: ID, where: TaskInput, sort: Sort = ASC, skip: Int, limit: Int = 20, count: Boolean = false): [Task]
}

type Mutation {
  createUser(user: UserInput): User @mason(path: "users"),
  createTask(task: TaskInput): Task @mason(path: "tasks")
}
`)