import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function isTokenExpired(token) {
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload));
    return decoded.exp ? Date.now() >= decoded.exp * 1000 : false;
  } catch {
    return true;
  }
}

export default function RequireAuth({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("USER_ROLE");

  const authed = !!token && !isTokenExpired(token);

  const forceLogin =
    new URLSearchParams(location.search).get("forceLogin") === "1";

  // if (forceLogin) {
  //   localStorage.removeItem("token");
  // }

  // console.log("authed", authed);
  // console.log("token", token);

  if (forceLogin) {
    localStorage.removeItem("token");

    // Remove forceLogin from URL
    const cleanPath = location.pathname;
    const query = new URLSearchParams(location.search);
    query.delete("forceLogin");

    const finalRedirect = `${cleanPath}${
      query.toString() ? "?" + query.toString() : ""
    }`;

    return (
      <Navigate
        to={`/Oauthlogin?redirect=${encodeURIComponent(finalRedirect)}`}
        replace
      />
    );
  }

  if (!authed) {
    const redirectPath = location.pathname + location.search;
    return (
      <Navigate
        to={`/Oauthlogin?redirect=${encodeURIComponent(redirectPath)}`}
        replace
      />
    );
  }

  // If USER_ROLE is invalid or empty
  const roleInvalid =
    !userRole ||
    userRole === "null" ||
    userRole === "undefined" ||
    userRole.trim() === "";

  if (roleInvalid) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}
