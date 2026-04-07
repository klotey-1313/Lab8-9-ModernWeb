import { roleRepository } from "../repositories/roleRepository.js";
import { userRepository } from "../repositories/userRepository.js";
import { AppError } from "../utils/appError.js";
import { stripSensitiveUserFields } from "../utils/safeObject.js";

export const rbacService = {
  async listRoles() {
    return roleRepository.findAll();
  },

  async assignRoles(userId, roles) {
    const validRoles = await roleRepository.findByNames(roles);

    if (validRoles.length !== roles.length) {
      throw new AppError("One or more roles are invalid", 400);
    }

    const roleIds = validRoles.map((r) => r._id);

    const user = await userRepository.updateById(userId, { roles: roleIds });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    return stripSensitiveUserFields(user);
  },

  async removeRole(userId, roleName) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const [roleToRemove] = await roleRepository.findByNames([roleName]);
    if (!roleToRemove) {
      throw new AppError("Role not found", 404);
    }

    const roleIdStr = String(roleToRemove._id);
    const nextRoles = (user.roles || []).filter(
      (r) => String(r._id || r) !== roleIdStr
    );

    const updated = await userRepository.updateById(userId, { roles: nextRoles.map((r) => r._id || r) });
    return stripSensitiveUserFields(updated);
  }
};