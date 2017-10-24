const express = require('express');
const bodyParser = require('body-parser');
const graphqlHTTP = require('express-graphql');
const graphqlMason = require('../../');

const schema = require('./schema')
const root = require('./resolver')

const app = express();
// Setup /graphql endpoint for GraphQL
app.use('/graphql', graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: true
}));
// Setup /api endpoint for REST
app.use('/api', bodyParser.json());
app.use('/api', graphqlMason({
  schema, 
  rootValue: root
}));
app.listen(4000);

console.log('Running GraphQL API server at http://localhost:4000/graphql')
console.log('Running REST API server at http://localhost:4000/api')