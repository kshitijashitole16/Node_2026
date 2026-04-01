export const validateRequest = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);

      return res.status(400).json({
        message: messages.join(", "),
        errors: messages,
      });
    }

    req.body = result.data;
    next();
  };
};