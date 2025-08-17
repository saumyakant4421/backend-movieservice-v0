const express = require("express");
const {
  getTrendingMovies,
  getMovieDetails,
  getMoviesByGenre,
  getMoviesByFranchise,
  searchMovies,
  getSimilarMovies,
  getStreamingProviders,
} = require("../controllers/movieController");

const router = express.Router();

router.get("/trending", getTrendingMovies);
router.get("/search", searchMovies);
router.get("/genres/:genre", getMoviesByGenre);
router.get("/franchises/:franchise", getMoviesByFranchise);
router.get("/:id", getMovieDetails);
router.get("/:id/similar", getSimilarMovies);
router.get("/:id/streaming", getStreamingProviders);

module.exports = router;