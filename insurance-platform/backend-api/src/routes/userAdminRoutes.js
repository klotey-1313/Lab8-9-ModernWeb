import { Router } from "express";
import { userAdminController } from "../controllers/userAdminController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { updateUserStatusValidator } from "../validators/userAdminValidator.js";
import { handleValidation } from "../middleware/validationMiddleware.js";

const router = Router();

router.get("/", authenticate, authorizeRoles("ADMIN", "COMPLIANCE_OFFICER"), userAdminController.listUsers);
router.post("/", authenticate, authorizeRoles("ADMIN"), userAdminController.createUser);
router.get("/customers", authenticate, authorizeRoles("ADMIN", "AGENT", "CUSTOMER_SERVICE"), userAdminController.listCustomers);
router.get("/:userId", authenticate, authorizeRoles("ADMIN", "COMPLIANCE_OFFICER", "CUSTOMER_SERVICE"), userAdminController.getUserById);
router.put("/:userId", authenticate, authorizeRoles("ADMIN"), userAdminController.updateUser);
router.put("/:userId/profile", authenticate, authorizeRoles("ADMIN"), userAdminController.updateUserProfile);
router.put("/:userId/status", authenticate, authorizeRoles("ADMIN"), updateUserStatusValidator, handleValidation, userAdminController.updateUserStatus);

export default router;