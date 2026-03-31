import { prisma } from "../config/db.js";

const watchlistController = async (req, res) => {
  try {
    const { movieId, status: watchlistStatus, rating, notes } = req.body;
    const userId = req.user?.id;

    if (!userId?.trim() || !movieId?.trim()) {
      return res.status(400).json({
        error: "Authenticated user and movieId are required",
      });
    }

    const movie = await prisma.movie.findUnique({
      where: { id: movieId.trim() },
    });

    if (!movie) {
      return res.status(404).json({
        error: "Movie not found",
      });
    }

    const existingInWatchList = await prisma.watchlistItem.findUnique({
      where: {
        userId_movieId: {
          userId: userId.trim(),
          movieId: movieId.trim(),
        },
      },
    });

    if (existingInWatchList) {
      return res.status(400).json({
        error: "Movie already in the watchlist",
      });
    }

    const watchlistItem = await prisma.watchlistItem.create({
      data: {
        userId: userId.trim(),
        movieId: movieId.trim(),
        status: watchlistStatus || "PLANNED",
        rating: rating ?? null,
        notes: notes?.trim() || null,
      },
    });

    return res.status(201).json({
      message: "Movie added to watchlist successfully",
      data: watchlistItem,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const removeFromWatchlistController = async (req, res) => {
  try {
    const { movieId } = req.params;
    const userId = req.user?.id;

    if (!userId?.trim() || !movieId?.trim()) {
      return res.status(400).json({
        error: "Authenticated user and movieId are required",
      });
    }

    const existingInWatchList = await prisma.watchlistItem.findUnique({
      where: {
        userId_movieId: {
          userId: userId.trim(),
          movieId: movieId.trim(),
        },
      },
    });
    
    if (!existingInWatchList) {
      return res.status(404).json({
        error: "Movie not found in the watchlist",
      });
    }
    
    const deletedWatchlistItem = await prisma.watchlistItem.delete({
      where: {
        userId_movieId: {
          userId: userId.trim(),
          movieId: movieId.trim(),
        },
      },
    });
    
    return res.status(200).json({
      message: "Movie removed from watchlist successfully",
      data: deletedWatchlistItem,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
const getWatchlistController = async (req, res) => {
  try {
    const {movieId} =req.body;
    const userId = req.user?.id;
    if (!userId?.trim()) {
      return res.status(400).json({
        error: "Authenticated user is required",
      });
    }
    const watchlistItems = await prisma.watchlistItem.findMany({
      where: {
        userId: userId.trim(),
      },
      include: {
        movie: true,
      },
    });
    const existingInWatchList = await prisma.watchlistItem.findUnique({
      where: {
        userId_movieId: {
          userId: userId.trim(),
          movieId: movieId.trim(),
        },
      },
    });
    
    if (!existingInWatchList) {
      return res.status(404).json({
        error: "Movie not found in the watchlist",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Watchlist items fetched successfully",
      data: watchlistItems,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
export { watchlistController , removeFromWatchlistController  ,getWatchlistController};