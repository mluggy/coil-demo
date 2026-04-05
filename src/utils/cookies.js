export function getCookie(name) {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function setCookie(name, value) {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax; Secure`;
  } catch {}
}

export function deleteCookie(name) {
  try {
    document.cookie = `${name}=; path=/; max-age=0`;
  } catch {}
}
