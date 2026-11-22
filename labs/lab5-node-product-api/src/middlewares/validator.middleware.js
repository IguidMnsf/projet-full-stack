import { body, param, validationResult } from 'express-validator';

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return next();
};

const field = (name, optional) => {
  const rule = body(name);
  return optional
    ? rule.optional()
    : rule.exists().withMessage(`Le champ ${name} est obligatoire`).bail();
};

const productRules = (optional = false) => [
  field('name', optional)
    .isString().withMessage('Le nom doit être une chaîne de caractères')
    .bail().trim().notEmpty().withMessage('Le nom est obligatoire'),
  field('price', optional)
    .isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif ou nul')
    .toFloat(),
  field('stock', optional)
    .isInt({ min: 0 }).withMessage('Le stock doit être un entier positif ou nul')
    .toInt()
];

export const validateId = [
  param('id').isInt({ min: 1 }).withMessage('Identifiant invalide').toInt(),
  handleValidation
];

export const validateProduct = [
  ...productRules(false),
  handleValidation
];

export const validateProductPatch = [
  ...productRules(true),
  handleValidation
];
