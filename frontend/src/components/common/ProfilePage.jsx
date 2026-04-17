import React, { useEffect, useState } from "react";
import "./ProfilePage.css"; // Add custom styling here
import cmxLogo from "../../assets/cmxlogo-removebg-preview.png";
import UserService from "../service/UserService"; // ✅ Import UserService

const UserProfileModal = ({ isOpen, onClose }) => {
  // State for user details
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    // ✅ Load values via UserService instead of localStorage directly
    const name = localStorage.getItem("name") || "N/A";
    const email = localStorage.getItem("userid") || "N/A";
    const role = localStorage.getItem("USER_ROLE") || "N/A"; // fallback if not present

    setUserName(name);
    setUserEmail(email);
    setUserRole(role);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay ">
      <div className="modal-content">
        <div className="Profile-logo-container">
          <img src={cmxLogo} alt="CMX Logo" />
        </div>
        <h3 style={{ fontSize: "30px", color: "black", marginBottom: "50px" }}>
          User Profile
        </h3>
        <div className="user-details">
          <div className="detail-row">
            <div className="detail-title">NAME:</div>
            <div className="detail-value">{userName}</div>
          </div>
          <div className="detail-row">
            <div className="detail-title">EMAIL:</div>
            <div className="detail-value">{userEmail}</div>
          </div>
          <div className="detail-row">
            <div className="detail-title">ACCESS LEVEL:</div>
            <div className="detail-value">{(userRole || "").toUpperCase()}</div>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default UserProfileModal;
