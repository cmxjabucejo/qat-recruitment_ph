import React from "react";
import {
  HiHome,
  HiClipboardList,
  HiDocumentText,
  HiPencilAlt,
  HiBriefcase,
} from "react-icons/hi";
import { useNavigate, useLocation } from "react-router-dom";

const SidebarIcon = ({ icon, label, active, onClick }) => (
  <div className="relative flex justify-center w-full">
    <div
      onClick={onClick}
      className={`
        group w-full flex justify-center p-2
        cursor-pointer transition-all duration-200
        ${
          active
            ? "bg-blue-100 text-blue-700"
            : "text-slate-500 hover:bg-slate-100"
        }
      `}
    >
      {icon}

      {/* Hover Tooltip */}
      {/* <div
        className={`
          absolute top-0 left-full h-full
          flex items-center px-4
          text-sm font-medium whitespace-nowrap
          z-[9999] shadow-md
          opacity-0 -translate-x-2
          group-hover:opacity-100 group-hover:translate-x-0
          transition-all duration-200 ease-out
          ${
            active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
          }
        `}
        style={{ borderRadius: "0 6px 6px 0" }}
      >
        {label}
        <div
          className={`
            absolute left-[-6px] top-1/2 -translate-y-1/2
            h-4 w-2 rounded-l-sm
            ${active ? "bg-blue-100" : "bg-slate-100"}
          `}
        />
      </div> */}
    </div>
  </div>
);

const SidebarIcons = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { icon: <HiHome size={20} />, label: "Dashboard", route: "/home" },
    {
      icon: <HiClipboardList size={20} />,
      label: "Tracker",
      route: "/tracker",
    },
    {
      icon: <HiDocumentText size={20} />,
      label: "EOL Assessment",
      route: "/EOLAssessment",
    },
    {
      icon: <HiPencilAlt size={20} />,
      label: "Typing Test",
      route: "/typingtest",
    },
    {
      icon: <HiBriefcase size={20} />,
      label: "Job Posting",
      route: "/jobposting",
    },
  ];

  return (
    <aside
      className="
        w-[52px] shrink-0
        bg-white border-r border-slate-200 shadow-sm
        flex flex-col items-center py-4 gap-5
      "
    >
      {items.map((item) => (
        <SidebarIcon
          key={item.label}
          icon={item.icon}
          label={item.label}
          active={location.pathname.startsWith(item.route)}
          onClick={() => navigate(item.route)}
        />
      ))}
    </aside>
  );
};

export default SidebarIcons;
