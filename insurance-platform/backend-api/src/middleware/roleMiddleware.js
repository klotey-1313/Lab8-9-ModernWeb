import { errorResponse } from "../utils/apiResponse.js";

function getRoleNames(user) {
  return (user?.roles || []).map((role) => {
    if (typeof role === "string") {
      return role;
    }

    if (role && typeof role === "object" && role.name) {
      return role.name;
    }

    return String(role);
  });
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const roleNames = getRoleNames(req.user);
    const hasAccess = allowedRoles.some((role) => roleNames.includes(role));

    if (!hasAccess) {
      return errorResponse(res, "Forbidden: insufficient role access", 403);
    }

    return next();
  };
}