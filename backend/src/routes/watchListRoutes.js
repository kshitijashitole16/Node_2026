import express from "express";

import { getWatchlistController, removeFromWatchlistController, watchlistController } from "../controller/watchlistController.js";
import { authMiddleware } from "../middkeware/authMiddkeware.js";

const watchlistRouter = express.Router();
watchlistRouter.use(authMiddleware);

watchlistRouter.post("/addTowatchlist", watchlistController);

watchlistRouter.delete("/removeFromWatchlist/:movieId", removeFromWatchlistController);

watchlistRouter.get("/getWatchlist/:movieId", getWatchlistController);

export default watchlistRouter;
