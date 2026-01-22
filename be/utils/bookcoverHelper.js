const axios = require('axios');

const BOOKCOVER_API_BASE = 'https://bookcover.longitood.com/bookcover';
const DEFAULT_TIMEOUT_MS = 1000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 100;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (error) => {
    if (!error) return false;
    if (error.code === 'ECONNABORTED') return true;
    if (typeof error.message === 'string' && error.message.includes('timeout')) {
        return true;
    }
    const status = error.response?.status;
    if (status === 429) return true;
    if (status && status >= 500) return true;
    return false;
};

const requestWithRetry = async (requestFn, label) => {
    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
        try {
            return await requestFn();
        } catch (error) {
            if (!shouldRetry(error) || attempt > MAX_RETRIES) {
                throw error;
            }
            await sleep(RETRY_DELAY_MS * attempt);
        }
    }
    return null;
};

/**
 * Fetch book cover URL using ISBN
 * @param {string} isbn - The ISBN-13 of the book
 * @returns {Promise<string|null>} - The cover image URL or null if not found
 */
const fetchCoverByISBN = async (isbn) => {
    if (!isbn) return null;

    try {
        const response = await requestWithRetry(
            () =>
                axios.get(`${BOOKCOVER_API_BASE}/${isbn}`, {
                    timeout: DEFAULT_TIMEOUT_MS
                }),
            `isbn:${isbn}`
        );

        if (response.data && response.data.url) {
            return response.data.url;
        }
        return null;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return null;
        }
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
        const response = await requestWithRetry(
            () =>
                axios.get(BOOKCOVER_API_BASE, {
                    params: {
                        book_title: title,
                        author_name: author
                    },
                    timeout: DEFAULT_TIMEOUT_MS
                }),
            `title:${title}`
        );

        if (response.data && response.data.url) {
            return response.data.url;
        }
        return null;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return null;
        }
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

    console.warn(
        `Failed to fetch cover after retries and fallback for ISBN ${isbn || 'N/A'} (${title || 'Unknown'} by ${author || 'Unknown'})`
    );
    return null;
};

module.exports = {
    fetchCoverByISBN,
    fetchCoverByTitleAuthor,
    getBookCover
};
