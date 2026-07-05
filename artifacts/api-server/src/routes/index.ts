import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import auditRouter from "./audit";
import motherRouter from "./mother";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(auditRouter);
router.use(motherRouter);

export default router;
