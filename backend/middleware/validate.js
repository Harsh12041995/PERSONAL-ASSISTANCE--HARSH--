// backend/middleware/validate.js
// Zod-based request validation. Use on any route to reject malformed input at
// the edge with a 422 + structured details, before it reaches a controller.
//
//   const { validate } = require('../middleware/validate');
//   router.post('/tasks', validate({ body: CreateTaskSchema }), controller.create);

/**
 * @param {{ body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schemas
 */
const validate = (schemas) => (req, _res, next) => {
    try {
        if (schemas.body) req.body = schemas.body.parse(req.body);
        if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
        if (schemas.params) req.params = schemas.params.parse(req.params);
        next();
    } catch (err) {
        next(err); // ZodError is normalized to 422 by the central error handler.
    }
};

module.exports = { validate };
