/**
 * Validates and formats a potential URL string.
 * Prepends 'http://' for localhost/local IPs or 'https://' for external domains if no protocol is present.
 * Returns the formatted URL string if valid, or null if invalid.
 */
export const formatAndValidateUrl = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return null;
  }

  let urlToTest = trimmed;
  if (!/^https?:\/\//i.test(urlToTest)) {
    if (
      /^localhost(:\d+)?(\/.*)?$/i.test(urlToTest) ||
      /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(urlToTest)
    ) {
      urlToTest = `http://${urlToTest}`;
    } else {
      urlToTest = `https://${urlToTest}`;
    }
  }

  try {
    const parsed = new URL(urlToTest);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    const hostname = parsed.hostname;
    if (!hostname) {
      return null;
    }

    if (hostname === 'localhost') {
      return urlToTest;
    }

    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(hostname)) {
      const octets = hostname.split('.').map(Number);
      if (octets.every(o => o >= 0 && o <= 255)) {
        return urlToTest;
      }
      return null;
    }

    const parts = hostname.split('.');
    if (parts.length < 2) {
      return null;
    }

    const labelRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
    for (const part of parts) {
      if (!labelRegex.test(part) || part.length > 63) {
        return null;
      }
    }

    const tld = parts[parts.length - 1];
    if (!/^[a-zA-Z]{2,}$/.test(tld)) {
      return null;
    }

    return urlToTest;
  } catch {
    return null;
  }
};
