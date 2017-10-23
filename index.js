const pathToRegexp = require('path-to-regexp');

function graphqlMason(options) {
  if(!options) {
    throw new Error('GraphQL Mason requires options.');
  }

  const queryRouteMap = new Map;
  const mutationRouteMap = new Map;

  const schema = options.schema;
  const root = options.rootValue;

  // Setup Queries
  let rootFields = schema.getQueryType().getFields();

  for(let field in rootFields) {
    const baseAPIPath = resolvePathFromType(rootFields[field]);
    // Base route => resolver
    queryRouteMap.set(pathToRegexp(baseAPIPath), {
      resolver: root[field],
      args: rootFields[field].args
    });

    // If the root has an argument which takes an ID, then create /:id 
    // which just calls the resolver setting the appropriate field to id
    let IDarg = rootFields[field].args.find(arg => arg.type.toString() === 'ID');
    if(IDarg) {
      queryRouteMap.set(pathToRegexp(baseAPIPath + '/:id'), {
        resolver: id => (args, request) => {
          return root[field]({...args, [IDarg.name]: id }, request)
        },
        args: rootFields[field].args
      });
    }
  }

  // Setup Mutations
  rootFields = schema.getMutationType().getFields();

  for(let field in rootFields) {
    const baseAPIPath = resolvePathFromType(rootFields[field]);
    mutationRouteMap.set(pathToRegexp(baseAPIPath), {
      resolver: root[field],
      args: rootFields[field].args
    })
  }
  
  // Remove rootFields
  rootFields = null;

  return (request, response) => {
    let foundMatch = false;
    if(request.method === 'GET') {
      queryRouteMap.forEach(({resolver, args}, route) => {
        const match = route.exec(request.path);
        if(match === null) return;
        foundMatch = true;
        if(match.length === 2) {
          resolver = resolver(match[1]);
        }

        const result = resolver(parseArgs(request.query, args), request);

        if(result instanceof Promise) {
          result.then(res => response.json(res));
        } else {
          response.json(result);
        }
      })
    }

    if(request.method === 'POST') {
      mutationRouteMap.forEach(({resolver, args}, route) => {
        const math = route.exec(request.path);
        if(math === null) return;
        foundMatch = true;

        const result = resolver(parseArgs(request.body, args), request);

        if(result instanceof Promise) {
          result.then(res => response.json(res));
        } else {
          response.json(result);
        }
      })
    }

    if(!foundMatch) {
      response.status(404).send('Invalid Endpoint');
    }
  }
}

/**
 * A helper function to parse the query inputs, which is usually just parsing JSON for args that aren't 'String' type. If an arg isn't provided in the query, we se the schema default value
 * @param {Object} query The request query object (express: request.query) or for mutations, the body (express: request.body with body-parser)
 * @param {Object} argTypes The type nodes for the arguments from the schema
 */
function parseArgs(query, argTypes) {
  // Do we need to do any other parsing here besides simple JSON?

  let args = query;
  argTypes.forEach(argType => {
    let argKey = argType.name;
    if (args[argKey] && typeof args[argKey] === 'string' && argType.type.toString() !== 'String') {
      try {
        args[argKey] = JSON.parse(args[argKey]);
      } catch (error) {
        //TODO: Throw 400 error for invalid JSON
        // throw httpError(400, 'Args are invalid JSON.');
      }
    } else if (typeof args[argKey] !== 'string' && typeof args[argKey] !== 'object') {
      args[argKey] = argType.defaultValue;
    }
  });

  return args;
}

function resolvePathFromType(node) {
  let path = '/' + node.name;
  node.astNode.directives.forEach(directive => {
    if(directive.name.kind === 'Name' && directive.name.value === 'mason') {
      // There's an @mason directive. Check for path:
      directive.arguments.forEach(argument => {
        if(argument.name.kind === 'Name' && argument.name.value === 'path') {
          // There's a path argument in the directive
          if(argument.value.kind === 'StringValue') {
            path = '/' + argument.value.value;
          }
          // TODO: Can there be valid non-string values for path?
        }
      })
    }
  })
  return path;
}

module.exports = graphqlMason;