import express from 'express';

const originalRouter = express.Router.bind(express);

express.Router = function (...args) {
  const router = originalRouter(...args);
  const methods = ['get', 'post', 'put', 'patch', 'delete'];

methods.forEach((method) => {
  const original = router[method].bind(router);
  router[method] = function(path, ...handlers) {
    const wrapped = handlers.map(handler => {
     
      if (typeof handler === 'function' && handler.length <= 3) {
        return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
      }
      return handler;
    });
    
    return original.call(this, path, ...wrapped);
  };
});
  return router;
};