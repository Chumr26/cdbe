const axios = require('axios');

const BOOKCOVER_API_BASE = 'https://bookcover.longitood.com/bookcover';

/**
 * Fetch book cover URL using ISBN
 * @param {string} isbn - The ISBN-13 of the book
 * @returns {Promise<string|null>} - The cover image URL or null if not found
 */
const fetchCoverByISBN = async (isbn) => {
    if (!isbn) return null;

    try {
        const response = await axios.get(`${BOOKCOVER_API_BASE}/${isbn}`, {
            timeout: 5000
        });

        if (response.data && response.data.url) {
            return response.data.url;
        }
        return null;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return null;
        }
        console.error(`Failed to fetch cover for ISBN ${isbn}:`, error.message);
        return null;
    }
};

/**
 * Fetch book cover URL using title and author
 * @param {string} title - The book title
 * @param {string} author - The author name
 * @returns {Promise<string|null>} - The cover image URL or null if not found
 */
const fetchCoverByTitleAuthor = async (title, author) => {
    if (!title || !author) return null;

    try {
        const response = await axios.get(BOOKCOVER_API_BASE, {
            params: {
                book_title: title,
                author_name: author
            },
            timeout: 5000
        });

        if (response.data && response.data.url) {
            return response.data.url;
        }
        return null;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return null;
        }
        console.error(`Failed to fetch cover for "${title}" by ${author}:`, error.message);
        return null;
    }
};

/**
 * Get book cover with fallback logic
 * Priority:
 * 1. ISBN search
 * 2. Title + Author search
 *
 * @param {Object} bookData - Object containing isbn, title, and author
 * @returns {Promise<string|null>} - The cover image URL or null
 */
const getBookCover = async ({ isbn, title, author }) => {
    // 1. Try ISBN
    if (isbn) {
        const isbnCover = await fetchCoverByISBN(isbn);
        if (isbnCover) return isbnCover;
    }

    // 2. Fallback to Title + Author
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
