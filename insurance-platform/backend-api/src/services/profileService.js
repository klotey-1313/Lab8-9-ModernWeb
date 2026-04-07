import { User } from "../models/User.js";
import { AppError } from "../utils/appError.js";
import { stripSensitiveUserFields } from "../utils/safeObject.js";

// Fields a user may update on their own profile. Sensitive fields such as
// userType, roles, accountStatus, customerNumber, employeeNumber and
// internalAccessStatus are deliberately excluded.
const ALLOWED_OWN_PROFILE_FIELDS = new Set([
  "firstName",
  "lastName",
  "dateOfBirth",
  "email",
  "phone",
  "addressLine1",
  "addressLine2",
  "city",
  "province",
  "postalCode",
  "country",
  "preferredContactMethod",
  "emergencyContactName",
  "emergencyContactPhone",
  "clientCategory",
  "beneficiaryName"
]);

export const profileService = {
  async getOwnProfile(userId) {
    const user = await User.findById(userId).populate("roles");
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return stripSensitiveUserFields(user);
  },

  async updateOwnProfile(userId, updates) {
    const user = await User.findById(userId).populate("roles");
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Only apply whitelisted profile fields to prevent privilege escalation
    for (const [key, value] of Object.entries(updates)) {
      if (ALLOWED_OWN_PROFILE_FIELDS.has(key)) {
        user.profile[key] = value;
      }
    }

    await user.save();

    const refreshedUser = await User.findById(userId).populate("roles");
    return stripSensitiveUserFields(refreshedUser);
  }
};