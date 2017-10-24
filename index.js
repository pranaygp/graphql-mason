const pathToRegexp = require('path-to-regexp');

function graphqlMason(options) {
  if(!options) {
    throw new Error('GraphQL Mason requires options.');
  }

  const routeMap = new Map;

  const schema = options.schema;
  const root = options.rootValue;

  // Setup Queries
  let rootFields = schema.getQueryType().getFields();

  for(let field in rootFields) {
    const apiPath = resolvePathFromType(rootFields[field]);
    const apiMethod = resolveMethodFromType(rootFields[field], 'GET');

    const pathKeys = []
    const pathRegexp = pathToRegexp(apiPath, pathKeys);

    const args = rootFields[field].args;
    const fieldResolver = root[field];
 
    // Base route => resolver
    routeMap.set(pathRegexp, {
      resolver: (request, match) => {
        const urlValuesMap = pathKeys.reduce((prev, curr, currI) => {
          prev[curr.name] = match[currI];
          return prev;
        }, {});
        let argsMap;
        if (request.method === 'GET') {
          argsMap = parseArgs(args, request.query, urlValuesMap)
        } else {
          // TODO: Don't rely on body-parser. Do it implicitly here
          argsMap = parseArgs(args, request.body, urlValuesMap)
        }
        return fieldResolver(argsMap, request);
      },
      method: apiMethod
    });
  }

  // Setup Mutations
  rootFields = schema.getMutationType().getFields();

  for(let field in rootFields) {
    const apiPath = resolvePathFromType(rootFields[field]);
    const apiMethod = resolveMethodFromType(rootFields[field], 'POST');
    
    const pathKeys = []
    const pathRegexp = pathToRegexp(apiPath, pathKeys);

    const args = rootFields[field].args;
    const fieldResolver = root[field];
  
    // Base route => resolver
    routeMap.set(pathRegexp, {
      resolver: (request, match) => {
        const urlValuesMap = pathKeys.reduce((prev, curr, currI) => {
          prev[curr.name] = match[currI];
          return prev;
        }, {});
        let argsMap;
        if (request.method === 'GET') {
          argsMap = parseArgs(args, request.query, urlValuesMap)
        } else {
          // TODO: Don't rely on body-parser. Do it implicitly here
          argsMap = parseArgs(args, request.body, urlValuesMap)
        }
        return fieldResolver(argsMap, request);
      },
      method: apiMethod
    });
  }
  
  // Remove rootFields
  rootFields = null;

  return (request, response) => {
    let foundMatch = false;
    routeMap.forEach(({resolver, method}, route) => {
      if(foundMatch) return;
      if(method !== request.method) return;
      const match = route.exec(request.path);
      if(match === null) return;
      foundMatch = true;

      const result = resolver(request, match.slice(1));

      if(result instanceof Promise) {
        result
          .then(res => response.json(res))
          .catch(err => {
            response.statusCode = 500;
            response.send('Internal Server Error');
          });
      } else {
        response.json(result);
      }
    })

    if(!foundMatch) {
      response.statusCode = 404;
      response.send('Invalid Endpoint');
    }
  }
}

/**
 * A helper function to parse the query inputs, which is usually just parsing JSON for args that aren't 'String' type. If an arg isn't provided in the query, we se the schema default value
 * @param {Object} argTypes The type nodes for the arguments from the schema
 * @param {Object} query The request query object (express: request.query) or for mutations, the body (express: request.body with body-parser)
 * @param {Object} urlValues The request url matched values
 */
function parseArgs(argTypes, query, urlMatch) {
  // Do we need to do any other parsing here besides simple JSON?
  let args = {};
  argTypes.forEach(argType => {
    let argKey = argType.name;

    // First check the url params
    if(urlMatch[argKey] && typeof urlMatch[argKey] === 'string') {
      args[argKey] = urlMatch[argKey];
      if(argType.type.toString() === 'Int') {
        args[argKey] = Number(args[argKey]);
      }
    } 

    // Look at the query object, and override anything in the args we find from here
    // If it's not a string type, we try to JSON parse the value, else we just set the value
    if(query[argKey] && typeof query[argKey] === 'string' && argType.type.toString() !== 'String') {
      try {
        args[argKey] = JSON.parse(query[argKey]);
      } catch (error) {
        //TODO: Throw 400 error for invalid JSON
      }
    } else if(query[argKey]) {
      args[argKey] = query[argKey];
    }

    // Didn't find a value in query or url. Set to default
    if (!args[argKey]) {
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

function resolveMethodFromType(node, defaultMethod) {
  let method = defaultMethod;
  node.astNode.directives.forEach(directive => {
    if(directive.name.kind === 'Name' && directive.name.value === 'mason') {
      // There's an @mason directive. Check for path:
      directive.arguments.forEach(argument => {
        if(argument.name.kind === 'Name' && argument.name.value === 'method') {
          // There's a method argument in the directive
          if(argument.value.kind === 'StringValue') {
            method = argument.value.value;
          }
        }
      })
    }
  })
  return method;
}

module.exports = graphqlMason;