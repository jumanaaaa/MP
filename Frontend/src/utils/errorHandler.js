/**
 * Extract readable error message from API response
 * @param {Error|Response} error - Error object or response
 * @returns {Promise<string>} - Formatted error message
 */
export const getErrorMessage = async (error) => {
  // If it's a Response object from fetch
  if (error instanceof Response) {
    try {
      const data = await error.json();
      
      // Backend returns { error: "..." } or { message: "..." }
      if (data.error) return data.error;
      if (data.message) return data.message;
      
      // Fallback to status text
      return `Error ${error.status}: ${error.statusText}`;
    } catch (jsonError) {
      // If response is not JSON
      return `Error ${error.status}: ${error.statusText}`;
    }
  }
  
  // If it's a regular Error object
  if (error instanceof Error) {
    return error.message;
  }
  
  // If it's a string
  if (typeof error === 'string') {
    return error;
  }
  
  // Fallback
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Format error for display with proper line breaks
 * @param {string} errorMessage - Raw error message
 * @returns {string} - Formatted error message
 */
export const formatErrorMessage = (errorMessage) => {
  // Replace \n with actual line breaks if present
  return errorMessage.replace(/\\n/g, '\n');
};