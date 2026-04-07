import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

function resolveRoleNames(roles = []) {
  return roles.map((role) => {
    if (typeof role === "string") return role;
    if (role && typeof role === "object" && role.name) return role.name;
    return String(role);
  });
}

export const tokenService = {
  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: String(user._id),
        username: user.username,
        roles: resolveRoleNames(user.roles)
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );
  }
};