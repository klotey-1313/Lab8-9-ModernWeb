import { Router } from "express";
import { rbacController } from "../controllers/rbacController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { assignRolesValidator } from "../validators/rbacValidator.js";
import { handleValidation } from "../middleware/validationMiddleware.js";

const router = Router();

router.get("/roles", authenticate, authorizeRoles("ADMIN", "COMPLIANCE_OFFICER"), rbacController.listRoles);
router.put("/users/:userId/roles", authenticate, authorizeRoles("ADMIN"), assignRolesValidator, handleValidation, rbacController.assignRoles);
router.delete("/users/:userId/roles/:roleName", authenticate, authorizeRoles("ADMIN"), rbacController.removeRole);

export default router;