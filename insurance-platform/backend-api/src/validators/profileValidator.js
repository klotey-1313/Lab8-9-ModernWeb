import { body } from "express-validator";

export const updateOwnProfileValidator = [
  body("firstName").optional().isString().trim(),
  body("lastName").optional().isString().trim(),
  body("dateOfBirth").optional().isISO8601().toDate(),
  body("email").optional().isEmail().normalizeEmail(),
  body("phone").optional().isString().trim(),
  body("addressLine1").optional().isString().trim(),
  body("addressLine2").optional().isString().trim(),
  body("city").optional().isString().trim(),
  body("province").optional().isString().trim(),
  body("postalCode").optional().isString().trim(),
  body("country").optional().isString().trim(),
  body("preferredContactMethod").optional().isString().trim(),
  body("emergencyContactName").optional().isString().trim(),
  body("emergencyContactPhone").optional().isString().trim(),
  body("clientCategory").optional().isString().trim(),
  body("beneficiaryName").optional().isString().trim()
];