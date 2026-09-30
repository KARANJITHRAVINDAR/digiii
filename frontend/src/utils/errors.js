/**
 * Utility to extract a safe, human-readable error message from API / Axios errors.
 * Handles FastAPI string details, Pydantic validation error arrays ([{ loc, msg, type }]),
 * and fallback error representations to ensure React never attempts to render a raw object.
 */
export const getErrorMessage = (err, fallback = 'Operation failed.') => {
  if (!err) return fallback;

  const detail = err.response?.data?.detail;

  // 1. Plain string detail
  if (typeof detail === 'string') {
    return detail;
  }

  // 2. FastAPI / Pydantic validation error array
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && item.msg) {
          const field = Array.isArray(item.loc) && item.loc.length > 1 ? `${item.loc[item.loc.length - 1]}: ` : '';
          return `${field}${item.msg}`;
        }
        return JSON.stringify(item);
      })
      .join('; ');
  }

  // 3. Object detail (e.g. { message: "..." })
  if (typeof detail === 'object' && detail !== null) {
    return detail.message || detail.msg || JSON.stringify(detail);
  }

  // 4. Standard Axios / JS Error
  if (err.message) {
    return err.message;
  }

  return fallback;
};

export default getErrorMessage;
