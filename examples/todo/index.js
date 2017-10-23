const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { buildSchema } = require('graphql');
const graphqlHTTP = require('express-graphql');
const graphqlMason = require('../../');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URL, { useMongoClient: true });
mongoose.Promise = global.Promise;

const User = mongoose.model('User', {
   name: String,
   email: String,
   dateCreated: { type: Date, default: Date.now }
})

const Task = mongoose.model('Task', {
  name: String,
  description: String,
  deadline: Date,
  completed: { type: Boolean, default: false},
  assignedUser: mongoose.Schema.Types.ObjectId,
  assignedUserName: String,
  dateCreated: { type: Date, default: Date.now }
})

// const pranay = new User({name: 'Pranay', email: 'pranay.gp@gmail.com'});
// pranay.save();

// const task = new Task({
//   name: 'Make GraphQL Mason',
//   description: 'description',
//   assignedUser: "59ed398ef36d286475432032",
//   assignedUserName: "Pranay"
// })

// task.save();

const schema = buildSchema(`
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

const pendingTasksResolver = user => async () => {
  return await Task.find({
    assignedUser: user._id,
    completed: false
  })
}

const assignedUserResolver = task => async () => {
  return await User.findById(task.assignedUser)
}

const assignedUserNameResolver = task => async () => {
  return (await User.findById(task.assignedUser)).name
}

const root = {
  users: async ({id, where, sort, skip, limit, count}) => {
    let query;
    if (where) {
      query = User.find(where);
    } else {
      query = User.find();
    }
    if (id) {
      query.where('_id', id)
    }
    if (sort) {
      query.sort(sort.toLowerCase() + ' name')
    }
    if (skip) {
      query.skip(skip)
    }
    if (limit) {
      query.limit(limit)
    }

    let results = await query.exec();

    return results.map(user => ({...user.toObject(), pendingTasks: pendingTasksResolver(user)}));
  },
  tasks: async ({id, where, sort, skip, limit, count}) => {
    let query;

    if (where) {
      query = Task.find(where);
    } else {
      query = Task.find();
    }
    if (id) {
      query.where('_id', id)
    }
    if (sort) {
      query.sort(sort.toLowerCase() + ' name')
    }
    if (skip) {
      query.skip(skip)
    }
    if (limit) {
      query.limit(limit)
    }

    let results = await query.exec();
    
    return results.map(task => ({...task.toObject(), assignedUser: assignedUserResolver(task), assignedUserName: assignedUserNameResolver(task)}));
  },
  createUser: async ({user}) => {
    let newUser = new User(user);
    let result = await newUser.save()
    return {
      ...result.toObject(),
      pendingTasks: pendingTasksResolver(result)
    }
  },
  createTask: async ({task}) => {
    let newTask = new Task(task);
    let result = await newTask.save()
    return {
      ...result.toObject(),
      assignedUser: assignedUserResolver(result),
      assignedUserName: assignedUserNameResolver(result)
    }
  }
}

const app = express();
app.use('/graphql', graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: true
}));
app.use('/api', bodyParser.json());
app.use('/api', graphqlMason({
  schema, 
  rootValue: root
}));
app.listen(4000);

console.log('Running GraphQL API server at http://localhost:4000/graphql')
console.log('Running REST API server at http://localhost:4000/api')