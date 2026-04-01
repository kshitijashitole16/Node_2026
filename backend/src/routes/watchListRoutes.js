import express from "express";

import { getWatchlistController, removeFromWatchlistController, watchlistController } from "../controller/watchlistController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { addTowatchlistScheme } from "../validators/watchlistvalidators.js";

const watchlistRouter = express.Router();
watchlistRouter.use(authMiddleware);

watchlistRouter.post("/addTowatchlist", validateRequest(addTowatchlistScheme), watchlistController);

watchlistRouter.delete("/removeFromWatchlist/:movieId", removeFromWatchlistController);

watchlistRouter.get("/getWatchlist/:movieId", getWatchlistController);

export default watchlistRouter;
