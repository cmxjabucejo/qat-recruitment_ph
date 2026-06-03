import { SERVER_URL } from "../lib/constants";

export const getCSRFToken = async () => {
  const response = await fetch(`${SERVER_URL}/csrf-token`, {
    method: "GET",
    credentials: "include", // send session cookie
  });

  if (!response.ok) {
    throw new Error("Failed to fetch CSRF token");
  }

  const data = await response.json();

  return data.csrfToken;
};
