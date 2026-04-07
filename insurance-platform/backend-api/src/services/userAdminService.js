import bcrypt from "bcryptjs";
import { userRepository } from "../repositories/userRepository.js";
import { roleRepository } from "../repositories/roleRepository.js";
import { AppError } from "../utils/appError.js";
import { stripSensitiveUserFields } from "../utils/safeObject.js";

export const userAdminService = {
  async listUsers() {
    const users = await userRepository.findAll();
    return users.map(stripSensitiveUserFields);
  },

  async createUser({ fullName, email, password, roles, status }) {
    const nameParts = (fullName || "").trim().split(" ");
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.slice(1).join(" ") || "Unknown";

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError("A user with this email already exists", 409);
    }

    const validRoles = await roleRepository.findByNames(roles || []);
    if (validRoles.length !== (roles || []).length) {
      throw new AppError("One or more roles are invalid", 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const username = email.toLowerCase().replace(/[^a-z0-9]/g, "_");

    const user = await userRepository.create({
      username,
      passwordHash,
      roles: validRoles.map((r) => r._id),
      accountStatus: status || "ACTIVE",
      profile: {
        firstName,
        lastName,
        email: email.toLowerCase().trim(),
        userType: roles?.includes("CUSTOMER") ? "CUSTOMER" : "INTERNAL"
      }
    });

    const populated = await userRepository.findById(user._id);
    return stripSensitiveUserFields(populated);
  },

  async updateUser(userId, { fullName, email, roles, status }) {
    const update = {};

    if (fullName) {
      const nameParts = fullName.trim().split(" ");
      update["profile.firstName"] = nameParts[0] || "Unknown";
      update["profile.lastName"] = nameParts.slice(1).join(" ") || "Unknown";
    }

    if (email) {
      update["profile.email"] = email.toLowerCase().trim();
    }

    if (status) {
      update.accountStatus = status;
    }

    if (roles && roles.length > 0) {
      const validRoles = await roleRepository.findByNames(roles);
      if (validRoles.length !== roles.length) {
        throw new AppError("One or more roles are invalid", 400);
      }
      update.roles = validRoles.map((r) => r._id);
    }

    const user = await userRepository.updateById(userId, update);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return stripSensitiveUserFields(user);
  },

  async listCustomers() {
     const users = await userRepository.findCustomers();
    return users.map(stripSensitiveUserFields);
  },

  async getUserById(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return stripSensitiveUserFields(user);
  },

  async updateUserProfile(userId, profileFields) {
    const update = {};
    for (const [key, value] of Object.entries(profileFields)) {
      update[`profile.${key}`] = value;
    }
    const user = await userRepository.updateById(userId, update);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return stripSensitiveUserFields(user);
  },

  async updateUserStatus(userId, accountStatus) {
    const user = await userRepository.updateById(userId, { accountStatus });
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return stripSensitiveUserFields(user);
  }
};