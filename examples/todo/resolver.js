const mongoose = require('mongoose');
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

module.exports = {
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
  user: async ({id}) => User.findById(id),
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
  task: async ({id}) => Task.findById(id),
  createUser: async ({user}) => {
    let newUser = new User(user);
    let result = await newUser.save()
    return {
      ...result.toObject(),
      pendingTasks: pendingTasksResolver(result)
    }
  },
  deleteUser: async ({id}) => User.findByIdAndRemove(id),
  createTask: async ({task}) => {
    let newTask = new Task(task);
    let result = await newTask.save()
    return {
      ...result.toObject(),
      assignedUser: assignedUserResolver(result),
      assignedUserName: assignedUserNameResolver(result)
    }
  },
  deleteTask: async ({id}) => Task.findByIdAndRemove(id),
}