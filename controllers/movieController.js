const {
  fetchTrendingMovies,
  fetchMovieDetails,
  fetchMoviesByGenre,
  fetchMoviesByFranchise,
  fetchStreamingProviders,
  fetchSimilarMovies,
  GENRES,
  FRANCHISES,
} = require("../services/movieService");

const axios = require("axios");
require("dotenv").config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const GENRE_ALIASES = {
  SciFi: "Science Fiction",
};

const getTrendingMovies = async (req, res) => {
  try {
    const movies = await fetchTrendingMovies();
    res.json(movies);
  } catch (error) {
    console.error("Controller Error in getTrendingMovies:", error.message);
    res.status(500).json({ error: "Failed to fetch trending movies" });
  }
};

const getMovieDetails = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid movie ID" });
  }
  try {
    const movie = await fetchMovieDetails(id);
    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }
    res.json(movie);
  } catch (error) {
    console.error("Controller Error in getMovieDetails:", error.message);
    res.status(500).json({ error: "Failed to fetch movie details" });
  }
};

const getMoviesByGenre = async (req, res) => {
  let genreName = req.params.genre;
  if (GENRE_ALIASES[genreName]) genreName = GENRE_ALIASES[genreName];
  const genreKey = Object.keys(GENRES).find(key => key.toLowerCase() === genreName.toLowerCase());
  if (!genreKey) return res.status(400).json({ error: "Invalid genre" });
  try {
    const movies = await fetchMoviesByGenre(GENRES[genreKey]);
    res.json(movies);
  } catch (error) {
    console.error("Controller Error in getMoviesByGenre:", error.message);
    res.status(500).json({ error: "Failed to fetch movies by genre" });
  }
};

const getMoviesByFranchise = async (req, res) => {
  const franchiseKey = Object.keys(FRANCHISES).find(key => key.toLowerCase() === req.params.franchise.toLowerCase());
  if (!franchiseKey) return res.status(400).json({ error: "Invalid franchise" });
  try {
    const movies = await fetchMoviesByFranchise(FRANCHISES[franchiseKey]);
    res.json(movies);
  } catch (error) {
    console.error("Controller Error in getMoviesByFranchise:", error.message);
    res.status(500).json({ error: "Failed to fetch franchise movies" });
  }
};

const searchMovies = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Search query is required" });
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: { api_key: TMDB_API_KEY, query, page: 1, include_adult: false },
    });
    res.json(response.data.results || []);
  } catch (error) {
    console.error("Controller Error in searchMovies:", error.message);
    res.status(500).json({ error: "Failed to search movies" });
  }
};

const getSimilarMovies = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid movie ID" });
  try {
    const similarMovies = await fetchSimilarMovies(id);
    res.json(similarMovies);
  } catch (error) {
    console.error("Controller Error in getSimilarMovies:", error.message);
    res.status(500).json({ error: "Failed to fetch similar movies" });
  }
};

const getStreamingProviders = async (req, res) => {
  const { id } = req.params;
  const { region = "IN" } = req.query;
  if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid movie ID" });
  try {
    console.log(`Fetching streaming providers for movie ID ${id} in region ${region}`);
    const providers = await fetchStreamingProviders(id, region);
    console.log(`Streaming providers response for movie ID ${id}:`, providers);
    
    if (providers && providers.flatrate) {
      console.log(`Found ${providers.flatrate.length} streaming providers for movie ID ${id}`);
      res.json(providers);
    } else {
      console.log(`No streaming providers found for movie ID ${id} in region ${region}`);
      res.status(200).json(providers || { message: "No streaming providers found for this movie in the specified region" });
    }
  } catch (error) {
    console.error("Controller Error in getStreamingProviders:", error.message);
    res.status(200).json({ message: "Streaming info not available for this movie" });
  }
};

module.exports = {
  getTrendingMovies,
  getMovieDetails,
  getMoviesByGenre,
  getMoviesByFranchise,
  searchMovies,
  getSimilarMovies,
  getStreamingProviders,
};