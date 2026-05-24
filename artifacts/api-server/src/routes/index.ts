import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import activitiesRouter from "./activities";
import logsRouter from "./logs";
import analyticsRouter from "./analytics";
import recommendationsRouter from "./recommendations";
import historyRouter from "./history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(activitiesRouter);
router.use(logsRouter);
router.use(analyticsRouter);
router.use(recommendationsRouter);
router.use(historyRouter);

export default router;
