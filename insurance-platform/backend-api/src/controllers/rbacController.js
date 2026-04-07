import { rbacService } from "../services/rbacService.js";
import { successResponse } from "../utils/apiResponse.js";

export const rbacController = {
  async listRoles(req, res, next) {
    try {
      const data = await rbacService.listRoles();
      return successResponse(res, data, "Roles loaded");
    } catch (error) {
      next(error);
    }
  },

  async assignRoles(req, res, next) {
    try {
      const data = await rbacService.assignRoles(req.params.userId, req.body.roles);
      return successResponse(res, data, "Roles assigned");
    } catch (error) {
      next(error);
    }
  },

  async removeRole(req, res, next) {
    try {
      const data = await rbacService.removeRole(req.params.userId, req.params.roleName);
      return successResponse(res, data, "Role removed");
    } catch (error) {
      next(error);
    }
  }
};