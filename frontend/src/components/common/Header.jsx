import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import cmxLogo from "../../assets/CMX.png";
import cmxLogo2 from "../../assets/callmax_cover_removebg.png";
import cmxLogo3 from "../../assets/cmxlogo-removebg-preview.png";
import logoutIcon from "../../assets/logout_icon.png";
import { SERVER_URL } from "../lib/constants.js";
import "./Header.css";

// Reusable Logout Modal
const LogoutModal = ({ isVisible, onConfirm, onCancel }) => {
  if (!isVisible) return null;

  return (
    <div
      className="absolute inset-0 bg-black/30 flex items-center justify-center z-40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 w-[300px] text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-2">Confirm Logout</h2>
        <p className="text-sm text-slate-600 mb-4">
          Are you sure you want to log out?
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={onConfirm}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
          >
            Logout
          </button>
          <button
            onClick={onCancel}
            className="bg-slate-200 px-4 py-2 rounded-md hover:bg-slate-300 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const Header = ({
  userName = "User",
  userid,
  onLogoutClick,
  pageTitle = "",
}) => {
  const navigate = useNavigate();
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  // Get initials from username
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <header
      className="w-full bg-gradient-to-r from-[#e8f0fe] via-white to-[#e8f0fe] 
      border-b border-white/60 shadow-sm backdrop-blur"
    >
      <div className="w-full flex items-center justify-between px-6 py-2">
        {/* LEFT — logo + title */}
        <div className="flex items-center gap-3">
          <img src={cmxLogo3} alt="CMX Logo" className="h-8 object-contain" />
          <h1 className="text-lg mt-2 font-semibold text-slate-800 tracking-wide">
            Recruitment Management Hub
          </h1>
        </div>

        {/* RIGHT — user initials + name with logout modal trigger */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={onLogoutClick}
        >
          <div
            className="flex items-center justify-center 
              h-9 w-9 rounded-full bg-blue-600 text-white font-bold shadow-sm"
          >
            {getInitials(userName)}
          </div>

          <span className="text-sm text-slate-700 font-medium">{userName}</span>
        </div>
      </div>

      {/* ✅ Page Title Bar */}
      {pageTitle && (
        <div className="px-6 py-2 bg-white border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-700 ">{pageTitle}</h2>
        </div>
      )}
    </header>
  );
};

export default Header;
