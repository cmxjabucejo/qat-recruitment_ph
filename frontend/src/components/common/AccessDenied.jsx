import React from "react";
import { useNavigate } from "react-router-dom";

const AccessDenied = () => {
  const navigate = useNavigate(); // Initialize the useNavigate hook

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Access Denied</h1>
      <p style={styles.message}>
        You do not have permission to access this page.
      </p>
      <button
        onClick={(e) => {
          e.preventDefault();
          navigate(-1); // Navigate back to the previous page
        }}
        style={styles.button}
      >
        Back
      </button>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    textAlign: "center",
    backgroundColor: "#f9f9f9",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "bold",
    color: "#ff0000",
    marginBottom: "1rem",
  },
  message: {
    fontSize: "1.2rem",
    marginBottom: "1.5rem",
    color: "#555",
  },
  button: {
    fontSize: "1rem",
    color: "#fff",
    backgroundColor: "#007bff",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  },
  buttonHover: {
    backgroundColor: "#0056b3",
  },
};

export default AccessDenied;
