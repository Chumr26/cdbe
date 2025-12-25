const axios = require('axios');

const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_COVERS_BASE = 'https://covers.openlibrary.org/b/isbn';

/**
 * Fetch book cover URL from Open Library API using ISBN (Large size)
 * @param {string} isbn - The ISBN-13 of the book
 * @returns {Promise<string|null>} - The cover image URL or null if not found
 */
const fetchCoverByOpenLibrary = async (isbn) => {
  if (!isbn) return null;
  
  try {
    // Check if the image exists by using default=false which returns 404 if not found
    const url = `${OPEN_LIBRARY_COVERS_BASE}/${isbn}-L.jpg?default=false`;
    await axios.head(url, { timeout: 5000 });
    
    // Return the clean URL for the frontend
    return `${OPEN_LIBRARY_COVERS_BASE}/${isbn}-L.jpg`;
  } catch (error) {
    // Expected error if cover doesn't exist (404)
    if (error.response && error.response.status === 404) {
      return null;
    }
    console.error(`Failed to check Open Library cover for ISBN ${isbn}:`, error.message);
    return null;
  }
};

/**
 * Fetch book cover URL from Google Books API using ISBN
 * @param {string} isbn - The ISBN-13 of the book
 * @returns {Promise<string|null>} - The cover image URL or null if not found
 */
const fetchCoverByISBN = async (isbn) => {
  if (!isbn) return null;
  
  try {
    const response = await axios.get(GOOGLE_BOOKS_API_BASE, {
      params: {
        q: `isbn:${isbn}`
      },
      timeout: 5000
    });
    
    if (response.data.items && response.data.items.length > 0) {
      const volumeInfo = response.data.items[0].volumeInfo;
      if (volumeInfo.imageLinks) {
        // Prefer larger images if available, otherwise thumbnail
        return volumeInfo.imageLinks.extraLarge || 
               volumeInfo.imageLinks.large || 
               volumeInfo.imageLinks.medium || 
               volumeInfo.imageLinks.thumbnail || 
               volumeInfo.imageLinks.smallThumbnail;
      }
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch Google Books cover for ISBN ${isbn}:`, error.message);
    return null;
  }
};

/**
 * Fetch book cover URL from Google Books API using title and author
 * @param {string} title - The book title
 * @param {string} author - The author name
 * @returns {Promise<string|null>} - The cover image URL or null if not found
 */
const fetchCoverByTitleAuthor = async (title, author) => {
  if (!title || !author) return null;
  
  try {
    const response = await axios.get(GOOGLE_BOOKS_API_BASE, {
      params: {
        q: `intitle:${title}+inauthor:${author}`
      },
      timeout: 5000
    });
    
    if (response.data.items && response.data.items.length > 0) {
      const volumeInfo = response.data.items[0].volumeInfo;
      if (volumeInfo.imageLinks) {
        return volumeInfo.imageLinks.thumbnail || volumeInfo.imageLinks.smallThumbnail;
      }
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch Google Books cover for "${title}" by ${author}:`, error.message);
    return null;
  }
};

/**
 * Get book cover with fallback logic
 * Priority:
 * 1. Open Library (High Res)
 * 2. Google Books (ISBN)
 * 3. Google Books (Title + Author)
 * 
 * @param {Object} bookData - Object containing isbn, title, and author
 * @returns {Promise<string|null>} - The cover image URL or null
 */
const getBookCover = async ({ isbn, title, author }) => {
  // 1. Try Open Library first for High Res image
  if (isbn) {
    const olCover = await fetchCoverByOpenLibrary(isbn);
    if (olCover) return olCover;
  }

  // 2. Fallback to Google Books ISBN
  if (isbn) {
    const gbCover = await fetchCoverByISBN(isbn);
    if (gbCover) return gbCover;
  }
  
  // 3. Last resort: Google Books Title + Author
  if (title && author) {
    const textCover = await fetchCoverByTitleAuthor(title, author);
    if (textCover) return textCover;
  }
  
  return null;
};

module.exports = {
  fetchCoverByISBN,
  fetchCoverByTitleAuthor,
  getBookCover
};
