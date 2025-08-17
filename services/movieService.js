const axios = require("axios");
require("dotenv").config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OMDB_API_KEY = process.env.OMDB_API_KEY || ""; // Optional key
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const OMDB_BASE_URL = "http://www.omdbapi.com/";

// Add retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make API calls with retry logic
const makeApiCall = async (url, params, retryCount = 0) => {
  try {
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    // Log the error details
    console.error(`API call failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, {
      url,
      params,
      status: error.response?.status,
      message: error.message
    });
    
    // Check if we should retry
    if (retryCount < MAX_RETRIES - 1) {
      // Wait before retrying
      await delay(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
      return makeApiCall(url, params, retryCount + 1);
    }
    
    // If we've exhausted retries, throw the error
    throw error;
  }
};

const GENRES = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Fantasy: 14,
  Horror: 27,
  "Science Fiction": 878,
};

const FRANCHISES = {
  Marvel: 420818,
  DC: 297762,
  HarryPotter: 12445,
  StarWars: 11,
  JurassicPark: 329,
  LordOfTheRings: 120,
  FastAndFurious: 82992,
};

// Static mapping for streaming providers in India (fallback)
const staticStreamingMap = {
  "Iron Man": [
    { provider_id: 3, provider_name: "Disney+ Hotstar", logo_path: null },
    { provider_id: 2, provider_name: "Amazon Prime Video", logo_path: null }
  ],
  "Fight Club": [
    { provider_id: 2, provider_name: "Amazon Prime Video", logo_path: null }
  ],
  "Forrest Gump": [
    { provider_id: 1, provider_name: "Netflix", logo_path: null }
  ],
  "3 Idiots": [
    { provider_id: 2, provider_name: "Amazon Prime Video", logo_path: null },
    { provider_id: 1, provider_name: "Netflix", logo_path: null }
  ],
  "The Dark Knight": [
    { provider_id: 1, provider_name: "Netflix", logo_path: null },
    { provider_id: 2, provider_name: "Amazon Prime Video", logo_path: null }
  ],
  "Inception": [
    { provider_id: 2, provider_name: "Amazon Prime Video", logo_path: null }
  ],
  "The Matrix": [
    { provider_id: 1, provider_name: "Netflix", logo_path: null }
  ],
  "Avengers: Endgame": [
    { provider_id: 3, provider_name: "Disney+ Hotstar", logo_path: null }
  ],
  "The Shawshank Redemption": [
    { provider_id: 1, provider_name: "Netflix", logo_path: null }
  ],
  "Pulp Fiction": [
    { provider_id: 2, provider_name: "Amazon Prime Video", logo_path: null }
  ],
  "The Godfather": [
    { provider_id: 1, provider_name: "Netflix", logo_path: null }
  ],
  "The Lord of the Rings: The Fellowship of the Ring": [
    { provider_id: 2, provider_name: "Amazon Prime Video", logo_path: null }
  ],
  "The Silence of the Lambs": [
    { provider_id: 1, provider_name: "Netflix", logo_path: null }
  ],
  "Goodfellas": [
    { provider_id: 2, provider_name: "Amazon Prime Video", logo_path: null }
  ],
  "The Departed": [
    { provider_id: 1, provider_name: "Netflix", logo_path: null }
  ]
};

// Map TMDB provider IDs to our frontend provider IDs
const mapTMDBProviderToFrontend = (providers) => {
  if (!providers || !Array.isArray(providers)) return providers;
  
  // TMDB provider IDs to our frontend provider IDs mapping
  const providerMapping = {
    8: 1,  // Netflix
    9: 2,  // Amazon Prime Video
    337: 3, // Disney+ Hotstar
    350: 4, // Apple TV+
    531: 5, // Paramount+
    386: 6, // Peacock
    15: 7,  // Hulu
    2: 1,   // Netflix (alternative ID)
    3: 2,   // Amazon Prime Video (alternative ID)
    119: 3, // Disney+ (alternative ID)
    350: 4, // Apple TV+
    531: 5, // Paramount+
    386: 6, // Peacock
    15: 7,  // Hulu
  };
  
  console.log("Original providers:", providers);
  
  const mappedProviders = providers.map(provider => {
    const mappedId = providerMapping[provider.provider_id];
    if (mappedId) {
      console.log(`Mapped provider ${provider.provider_name} (ID: ${provider.provider_id}) to frontend ID: ${mappedId}`);
      return {
        ...provider,
        provider_id: mappedId
      };
    } else {
      console.log(`No mapping found for provider ${provider.provider_name} (ID: ${provider.provider_id})`);
    }
    return provider;
  });
  
  console.log("Mapped providers:", mappedProviders);
  return mappedProviders;
};

// Add cache for streaming data
const streamingCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const fetchStreamingProviders = async (movieId, region) => {
  try {
    // Check cache first
    const cacheKey = `${movieId}-${region}`;
    const cachedData = streamingCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      console.log(`Using cached streaming data for movie ${movieId} in region ${region}`);
      return cachedData.data;
    }
    
    console.log(`Fetching streaming providers for movie ${movieId} in region ${region}`);
    
    const data = await makeApiCall(`${TMDB_BASE_URL}/movie/${movieId}/watch/providers`, {
      api_key: TMDB_API_KEY,
      language: 'en-US',
      watch_region: region
    });
    
    if (!data || !data.results) {
      console.log('No streaming data found in TMDB response');
      return null;
    }
    
    const streamingData = data.results[region] || data.results.US;
    
    if (!streamingData) {
      console.log('No streaming data found for the specified region');
      return null;
    }
    
    const result = {
      flatrate: streamingData.flatrate || [],
      rent: streamingData.rent || [],
      buy: streamingData.buy || []
    };
    
    // Cache the result
    streamingCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    console.log(`Found ${result.flatrate.length} streaming providers`);
    
    return result;
  } catch (error) {
    console.error('Error fetching streaming providers:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return { flatrate: [], rent: [], buy: [] }; // Return empty arrays instead of throwing
  }
};

const fetchTrendingMovies = async () => {
  try {
    const data = await makeApiCall(`${TMDB_BASE_URL}/trending/movie/week`, {
      api_key: TMDB_API_KEY
    });
    return data.results || [];
  } catch (error) {
    console.error("Service Error fetching trending movies:", error.message);
    return []; // Return empty array instead of throwing
  }
};

const fetchMovieDetails = async (movieId) => {
  try {
    const data = await makeApiCall(`${TMDB_BASE_URL}/movie/${movieId}`, {
      api_key: TMDB_API_KEY,
      append_to_response: "credits,videos"
    });
    return data;
  } catch (error) {
    console.error(`Service Error fetching movie details for ID ${movieId}:`, error.message);
    return null; // Return null instead of throwing
  }
};

const fetchMoviesByGenre = async (genreId, page = 1) => {
  try {
    const data = await makeApiCall(`${TMDB_BASE_URL}/discover/movie`, {
      api_key: TMDB_API_KEY,
      with_genres: genreId,
      page
    });
    return data.results || [];
  } catch (error) {
    console.error(`Service Error fetching movies for genre ID ${genreId}:`, error.message);
    return []; // Return empty array instead of throwing
  }
};

const fetchMoviesByFranchise = async (collectionId) => {
  try {
    const data = await makeApiCall(`${TMDB_BASE_URL}/collection/${collectionId}`, {
      api_key: TMDB_API_KEY
    });
    return data.parts || [];
  } catch (error) {
    console.error(`Service Error fetching franchise movies for collection ID ${collectionId}:`, error.message);
    return []; // Return empty array instead of throwing
  }
};

const fetchSimilarMovies = async (movieId) => {
  try {
    console.log(`Fetching similar movies for movie ID ${movieId}`);
    const data = await makeApiCall(`${TMDB_BASE_URL}/movie/${movieId}/similar`, {
      api_key: TMDB_API_KEY,
      language: 'en-US',
      page: 1
    });
    
    if (!data || !data.results) {
      console.log('No similar movies found in TMDB response');
      return [];
    }
    
    console.log(`Found ${data.results.length} similar movies`);
    return data.results || [];
  } catch (error) {
    console.error(`Service Error fetching similar movies for ID ${movieId}:`, error.message);
    return []; // Return empty array instead of throwing
  }
};

module.exports = {
  fetchTrendingMovies,
  fetchMovieDetails,
  fetchMoviesByGenre,
  fetchMoviesByFranchise,
  fetchStreamingProviders,
  fetchSimilarMovies,
  GENRES,
  FRANCHISES,
};