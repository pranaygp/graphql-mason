const graphqlMason = require('../../');

const schema = require('./schema')
const root = require('./resolver')

module.exports = graphqlMason({
  schema,
  rootValue: root
})