import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiHome,
  HiClipboardList,
  HiDocumentText,
  HiPencilAlt,
  HiBriefcase,
  HiCheckCircle,
  HiXCircle,
} from "react-icons/hi";
import { DateRange } from "react-date-range";
import { format } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import SidebarIcons from "../../components/common/Sidebar"; // adjust path as needed
import Header from "../../components/common/Header"; // ✅ Import the new reusable Header
import callmaxCover from "../../assets/cmxlogo-removebg-preview.png";
import searchIcon from "../../assets/search_symbol.png";
import { SERVER_URL } from "../lib/constants";
import { apiFetch } from "../lib/apiFetch";

// Simple Status Chip
const StatusChip = ({ status }) => {
  const base = "px-3 py-1 rounded-full text-xs font-medium";

  const color =
    status === "Open"
      ? "bg-blue-100 text-blue-700"
      : status === "Closed"
        ? "bg-slate-200 text-slate-700"
        : status === "On Hold"
          ? "bg-yellow-100 text-yellow-700"
          : "bg-blue-100 text-blue-700";

  return <span className={`${base} ${color}`}>{status}</span>;
};

// Short date renderer
const formatShortDate = (iso) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function JobPosting({ user }) {
  const navigate = useNavigate();

  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: "", // "success" or "error"
    message: "",
  });

  const [dateRange, setDateRange] = useState([
    {
      startDate: null,
      endDate: null,
      key: "selection",
    },
  ]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [accountFilter, setAccountFilter] = useState("All");
  const [postings, setPostings] = useState([]);
  const [filteredPostings, setFilteredPostings] = useState([]);
  const [selectedPosting, setSelectedPosting] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // or "oldest"
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [accountOptions, setAccountOptions] = useState([]);
  const [maxId, setMaxId] = useState(null);
  const [formData, setFormData] = useState({
    job_code: "",
    position_title: "",
    department: "",
    account: "",
    workSetup: "",
    status: "Open",
    job_description: "",
    job_requirements: "",
  });

  useEffect(() => {
    if (statusModal.isOpen) {
      const timer = setTimeout(() => {
        setStatusModal({ isOpen: false, type: "", message: "" });
      }, 3000); // 3000 ms = 3 seconds

      return () => clearTimeout(timer); // Cleanup if component unmounts or modal closes early
    }
  }, [statusModal.isOpen]);

  const handleLogout = () => {
    try {
      localStorage.clear();
      navigate("/OauthLogin");
    } catch (error) {
      console.error("Logout Error:", error);
      alert("Logout failed. Please try again.");
    }
  };

  const formatRangeLabel = () => {
    const { startDate, endDate } = dateRange[0];
    if (!startDate || !endDate) return "Select Date Range";
    return `${format(startDate, "MMM dd, yyyy")} - ${format(
      endDate,
      "MMM dd, yyyy",
    )}`;
  };

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    const { startDate, endDate } = dateRange[0];

    let result = postings.filter((p) => {
      // 🔎 Search
      const matchesQuery = Object.values(p).some((val) =>
        val?.toString().toLowerCase().includes(q),
      );

      // 📅 Date range
      const postDate = new Date(p.created_datetime);
      const inRange =
        (!startDate || postDate >= startDate) &&
        (!endDate || postDate <= endDate);

      // 🟦 Status
      const matchesStatus = statusFilter === "All" || p.status === statusFilter;

      // 🏢 Department
      const matchesDepartment =
        departmentFilter === "All" || p.department === departmentFilter;

      // 🧾 Account
      const matchesAccount =
        accountFilter === "All" || p.account === accountFilter;

      return (
        matchesQuery &&
        inRange &&
        matchesStatus &&
        matchesDepartment &&
        matchesAccount
      );
    });

    // ⬆⬇ Sort
    result.sort((a, b) => {
      const dateA = new Date(a.created_datetime);
      const dateB = new Date(b.created_datetime);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredPostings(result);
  }, [
    searchQuery,
    postings,
    dateRange,
    sortOrder,
    statusFilter,
    departmentFilter,
    accountFilter,
  ]);

  // Fetch data
  useEffect(() => {
    const fetchPostings = async () => {
      try {
        const res = await apiFetch(`${SERVER_URL}/jobposts/job_postings`);
        const data = await res.json();
        if (data.success) {
          const jobs = data.data;
          setPostings(jobs);
          setFilteredPostings(jobs);

          // 🔹 Extract unique departments
          const departments = Array.from(
            new Set(jobs.map((job) => job.department).filter(Boolean)),
          ).sort();
          setDepartmentOptions(departments);

          // 🔹 Extract unique accounts
          const accounts = Array.from(
            new Set(jobs.map((job) => job.account).filter(Boolean)),
          ).sort();
          setAccountOptions(accounts);
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };

    fetchPostings();
  }, []);

  // ✅ FIX: declare user info BEFORE JSX return
  const userName = user.fullName || localStorage.getItem("name") || "User";
  const userid = user.userid || localStorage.getItem("userid") || "";

  const FilterChip = ({ icon, label, onClick }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddJobPosting = async (e) => {
    e.preventDefault();

    try {
      // 1. Get the max ID to generate a job code
      const resMaxId = await apiFetch(
        `${SERVER_URL}/jobposts/job_postings/max-id`,
      );
      const { maxId } = await resMaxId.json();
      const newId = maxId + 1;

      const job_code = `JOB-${newId.toString().padStart(4, "0")}`;

      // 2. Build request body
      const payload = {
        job_code,
        ...formData,
      };

      // 3. Submit to backend
      const res = await apiFetch(`${SERVER_URL}/jobposts/job_postings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        // 4. Success: close modal, reset form, re-fetch data
        setIsNewModalOpen(false);
        setFormData({
          position_title: "",
          department: "",
          account: "",
          workSetup: "",
          status: "Open",
          job_description: "",
          job_requirements: "",
        });

        // Re-fetch job postings
        const postingsRes = await apiFetch(
          `${SERVER_URL}/jobposts/job_postings`,
        );
        const postingsData = await postingsRes.json();
        if (postingsData.success) {
          setPostings(postingsData.data);
          setFilteredPostings(postingsData.data);
        }

        // ✅ Show success modal
        setStatusModal({
          isOpen: true,
          type: "success",
          message: "Job posting added successfully!",
        });
      } else {
        // ❌ Show fail modal
        setStatusModal({
          isOpen: true,
          type: "error",
          message: "Failed to add job posting. Please try again.",
        });
      }
    } catch (err) {
      console.error("Add job posting error:", err);
      setStatusModal({
        isOpen: true,
        type: "error",
        message: "Something went wrong. Please try again.",
      });
    }
  };

  // Fetch max ID from job postings for job code generation
  const fetchMaxId = async () => {
    try {
      const res = await apiFetch(`${SERVER_URL}/jobposts/job_postings/max-id`);
      const data = await res.json();
      if (data.success) {
        setMaxId(data.maxId + 1); // increment for new record
      }
    } catch (err) {
      console.error("Failed to fetch max ID:", err);
    }
  };

  useEffect(() => {
    fetchMaxId();
  }, []);

  //Generate job code using the first letter of the department, first two letters of the position title, current year and month, and the next available ID on the database.
  useEffect(() => {
    const generateJobCode = () => {
      const { department, position_title } = formData;
      if (department && position_title && maxId) {
        const firstLetter = department.charAt(0).toUpperCase();
        const firstTwoLetters = position_title
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase())
          .slice(0, 2)
          .join("");
        const date = new Date();
        const year = String(date.getFullYear()).slice(2); // e.g., "24"
        const month = String(date.getMonth() + 1).padStart(2, "0"); // e.g., "07"
        const code = `${firstLetter}${firstTwoLetters}-${year}${month}-${maxId}`;

        setFormData((prev) => ({ ...prev, job_code: code }));
      }
    };

    generateJobCode();
  }, [formData.department, formData.position_title, maxId]);

  const handleEditJobPosting = async (updatedData, id) => {
    try {
      const res = await apiFetch(`${SERVER_URL}/jobposts/job_postings/${id}`, {
        method: "PUT", // or "PATCH" depending on backend
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      const data = await res.json();

      if (data.success) {
        // Update local state after successful update
        const updatedPostings = postings.map((post) =>
          post.id === id ? { ...post, ...updatedData } : post,
        );
        setPostings(updatedPostings);
        setFilteredPostings(updatedPostings);
        // ✅ Fix: Also update preview panel
        setSelectedPosting((prev) =>
          prev && prev.id === id ? { ...prev, ...updatedData } : prev,
        );
        setFormData((prev) => ({
          ...prev,
          ...updatedData,
        }));

        setStatusModal({
          isOpen: true,
          type: "success",
          message: "Job posting updated successfully!",
        });
      } else {
        setStatusModal({
          isOpen: true,
          type: "error",
          message: "Failed to update job posting. Please try again.",
        });
      }
    } catch (error) {
      console.error("Edit error:", error);
      setStatusModal({
        isOpen: true,
        type: "error",
        message: "An error occurred while updating the posting.",
      });
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex text-slate-900">
      {/* ───── SIDEBAR ───── */}
      <SidebarIcons />

      {/* ───── MAIN CONTENT (Header + Table + Preview) ───── */}
      <div className="flex-1 flex flex-col">
        {/* ───── HEADER (INSERTED HERE) ───── */}
        {/* ───── DARK COMPACT HEADER ───── */}
        <Header
          userName={userName}
          userid={userid}
          onLogoutClick={() => setIsLogoutModalVisible(true)}
          pageTitle="Job Postings"
        />

        {/* CONTENT SPLIT */}
        {/* ───── CONTENT SPLIT ───── */}
        <div className="flex flex-row flex-1">
          {/* ───── FILTER COLUMN ───── */}
          <div className="w-[270px] bg-white border-r px-5 py-6 flex flex-col gap-6">
            {/* FILTER TITLE */}
            <h2 className="text-xs font-semibold text-slate-600 uppercase">
              Filters
            </h2>

            {/* SORT ORDER */}
            <div>
              <label className="text-[11px] uppercase text-slate-500 font-semibold block mb-1">
                Sort by
              </label>
              <button
                className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700"
                onClick={() =>
                  setSortOrder((prev) =>
                    prev === "newest" ? "oldest" : "newest",
                  )
                }
              >
                {sortOrder === "newest" ? "Newest First" : "Oldest First"}
              </button>
            </div>

            {/* STATUS FILTER */}
            <div>
              <label className="text-[11px] uppercase text-slate-500 font-semibold block mb-1">
                Status
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {["All", "Open", "Closed"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 text-xs rounded-full transition ${
                      statusFilter === status
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 hover:bg-slate-300"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* DEPARTMENT FILTER */}
            <div>
              <label className="text-[11px] uppercase text-slate-500 font-semibold block mb-1">
                Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="mt-1 w-full text-sm px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 
        focus:ring-2 focus:ring-blue-300 outline-none"
              >
                <option value="All">All</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* ACCOUNT FILTER */}
            <div>
              <label className="text-[11px] uppercase text-slate-500 font-semibold block mb-1">
                Account
              </label>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="mt-1 w-full text-sm px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 
        focus:ring-2 focus:ring-blue-300 outline-none"
              >
                <option value="All">All</option>
                {accountOptions.map((acct) => (
                  <option key={acct} value={acct}>
                    {acct}
                  </option>
                ))}
              </select>
            </div>

            {/* DATE RANGE FILTER */}
            <div className="relative">
              <label className="text-[11px] uppercase text-slate-500 font-semibold block">
                Date Range
              </label>

              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={() => setShowCalendar((prev) => !prev)}
                  className="flex-1 text-sm px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 
          focus:ring-2 focus:ring-blue-300 outline-none text-left"
                >
                  {formatRangeLabel()}
                </button>

                <button
                  onClick={() => {
                    setDateRange([
                      {
                        startDate: null,
                        endDate: null,
                        key: "selection",
                      },
                    ]);
                    setShowCalendar(false);
                  }}
                  className="text-xs text-blue-600 hover:underline"
                  title="Clear Date Range"
                >
                  Reset
                </button>
              </div>

              {showCalendar && (
                <div
                  className="absolute z-50 bg-white border border-slate-200 shadow-lg mt-2 rounded-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DateRange
                    ranges={dateRange}
                    onChange={(item) => setDateRange([item.selection])}
                    maxDate={new Date()}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ───── LEFT: TABLE AREA ───── */}
          <div className="flex-1 flex flex-col px-8 py-6">
            {/* SEARCH + ADD BUTTON */}
            <div className="flex items-center mb-4">
              {/* SEARCH FIELD */}
              <div>
                <label className="text-[11px] uppercase text-slate-500 font-semibold block mb-1">
                  Search
                </label>

                <div className="relative w-[420px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Job title, code..."
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 
        text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  />

                  <img
                    src={searchIcon}
                    className="w-4 opacity-60 absolute left-3 top-1/2 -translate-y-1/2"
                    alt="Search"
                  />
                </div>
              </div>

              {/* NEW JOB POSTING BUTTON */}
              <button
                className="ml-4 mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition"
                onClick={() => setIsNewModalOpen(true)}
              >
                + Add Job Posting
              </button>

              {isNewModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
                  <div className="bg-white rounded-xl shadow-xl p-6 w-[480px] relative">
                    <h2 className="text-lg font-semibold mb-4">
                      Add New Job Posting
                    </h2>

                    {/* Close Button */}
                    <button
                      onClick={() => setIsNewModalOpen(false)}
                      className="absolute top-3 right-4 text-slate-500 hover:text-red-500"
                    >
                      ✕
                    </button>

                    <form
                      className="space-y-4 text-sm"
                      onSubmit={handleAddJobPosting}
                    >
                      <div>
                        <label className="block font-medium mb-1">
                          Job Code
                        </label>
                        <input
                          type="text"
                          name="job_code"
                          value={formData.job_code}
                          disabled
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1">
                          Position Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="position_title"
                          value={formData.position_title}
                          onChange={handleChange}
                          className="w-full border rounded px-3 py-2"
                          placeholder="e.g., Customer Service Rep"
                          required
                        />
                      </div>

                      {/* Department */}
                      <div>
                        <label className="block font-medium mb-1">
                          Department <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="department"
                          value={formData.department}
                          onChange={handleChange}
                          className="w-full border rounded px-3 py-2"
                          required
                        >
                          <option value="">Select</option>
                          <option value="Operations">Operations</option>
                          <option value="Accounting">Accounting</option>
                          <option value="Client Services">
                            Client Services
                          </option>
                          <option value="DREAM">DREAM</option>
                          <option value="Facilities">Facilities</option>
                          <option value="GSD">GSD</option>
                          <option value="HRAD">HRAD</option>
                          <option value="IT">IT</option>
                          <option value="Ops Support">Ops Support</option>
                          <option value="Recruitment">Recruitment</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-medium mb-1">
                          Account <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="account"
                          value={formData.account}
                          onChange={handleChange}
                          className="w-full border rounded px-3 py-2"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1">
                          Work Setup <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="workSetup"
                          value={formData.workSetup}
                          onChange={handleChange}
                          className="w-full border rounded px-3 py-2"
                          required
                        >
                          <option value="">— Select Setup —</option>
                          <option value="Onsite">Onsite</option>
                          <option value="WFH">WFH</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-medium mb-1">
                          Status <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          className="w-full border rounded px-3 py-2"
                          required
                        >
                          <option value="Open">Open</option>
                          <option value="Closed">Closed</option>
                          <option value="On Hold">On Hold</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-medium mb-1">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="job_description"
                          value={formData.job_description}
                          onChange={handleChange}
                          rows={4}
                          className="w-full border rounded px-3 py-2 resize-none overflow-y-auto"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-medium mb-1">
                          Requirements <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="job_requirements"
                          value={formData.job_requirements}
                          onChange={handleChange}
                          rows={4}
                          className="w-full border rounded px-3 py-2 resize-none overflow-y-auto"
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => setIsNewModalOpen(false)}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                        >
                          Add
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {statusModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                  <div className="bg-white rounded-xl shadow-xl p-6 w-[340px] text-center relative animate-fade-in-up">
                    {/* ✕ Close Button (top right) */}
                    <button
                      onClick={() =>
                        setStatusModal({ isOpen: false, type: "", message: "" })
                      }
                      className="absolute top-3 right-4 text-slate-400 hover:text-red-500 text-lg"
                    >
                      &times;
                    </button>

                    {/* Icon with ping effect */}
                    <div className="flex justify-center mb-4 relative">
                      <span
                        className={`absolute inline-flex h-16 w-16 rounded-full ${
                          statusModal.type === "success"
                            ? "bg-blue-300"
                            : "bg-red-300"
                        } opacity-75 animate-ping-slow`}
                      ></span>

                      {statusModal.type === "success" ? (
                        <HiCheckCircle className="text-blue-600 text-7xl relative z-10" />
                      ) : (
                        <HiXCircle className="text-red-500 text-7xl relative z-10" />
                      )}
                    </div>

                    {/* Message */}
                    <h3 className="text-lg font-semibold mb-2">
                      {statusModal.type === "success" ? "Success" : "Error"}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {statusModal.message}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* TABLE CARD */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {/* SCROLLABLE TABLE */}
              <div className="overflow-auto max-h-[520px] custom-scrollbar">
                <table className="min-w-full text-sm">
                  {/* TABLE HEADER */}
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[11px] tracking-wide sticky top-0 z-10 shadow-sm">
                    <tr>
                      <TH text="Job Code" />
                      <TH text="Position" />
                      <TH text="Department" />
                      <TH text="Account" />
                      <TH text="Status" />
                      <TH text="Created" />
                    </tr>
                  </thead>

                  {/* TABLE BODY */}
                  <tbody>
                    {filteredPostings.map((post) => (
                      <tr
                        key={post.id}
                        onClick={() => setSelectedPosting(post)}
                        className={`cursor-pointer transition-colors ${
                          selectedPosting?.id === post.id
                            ? "bg-blue-50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <TD>{post.job_code}</TD>
                        <TD className="font-semibold text-slate-800">
                          {post.position_title}
                        </TD>
                        <TD>{post.department}</TD>
                        <TD>{post.account}</TD>
                        <TD>
                          <StatusChip status={post.status} />
                        </TD>
                        <TD>{formatShortDate(post.created_datetime)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {isLogoutModalVisible && (
              <div
                className="absolute inset-0 bg-black/30 z-50 flex items-center justify-center"
                onClick={() => setIsLogoutModalVisible(false)}
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
                      onClick={handleLogout}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
                    >
                      Logout
                    </button>
                    <button
                      onClick={() => setIsLogoutModalVisible(false)}
                      className="bg-slate-200 px-4 py-2 rounded-md hover:bg-slate-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ───── RIGHT: PREVIEW PANEL (STATIC) ───── */}
          <div
            className="
    w-[350px] border-l border-slate-200 bg-white 
    shadow-xl p-6
    flex flex-col
    h-[calc(100vh-48px)] overflow-auto
  "
          >
            {selectedPosting ? (
              <PreviewPanel
                posting={selectedPosting}
                onSaveEdit={handleEditJobPosting}
                setSelectedPosting={setSelectedPosting} // ✅ Pass it as prop
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Select a job posting to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── SMALL COMPONENTS ───────────────────── */

const SidebarIcon = ({ icon, label, active }) => (
  <div className="relative flex justify-center w-full">
    {/* ICON BOX — now the hover trigger */}
    <div
      className={`
        group  /* <-- hover trigger ONLY on icon */
        p-3 w-full flex justify-center
        cursor-pointer transition-all duration-200
        ${
          active
            ? "bg-blue-100 text-blue-700"
            : "text-slate-500 hover:bg-slate-100"
        }
      `}
    >
      {icon}

      {/* FULL RECTANGLE LABEL — activates ONLY when ICON is hovered */}
      <div
        className={`
          absolute top-0 left-full h-full
          flex items-center px-4
          text-sm font-medium whitespace-nowrap
          z-[9999] shadow-md

          opacity-0 translate-x-[-8px]
          group-hover:opacity-100 group-hover:translate-x-0
          transition-all duration-200 ease-out

          ${
            active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
          }
        `}
        style={{ borderRadius: "0 6px 6px 0" }}
      >
        {label}

        {/* CONNECTOR BAR */}
        <div
          className={`
            absolute left-[-6px] top-1/2 -translate-y-1/2 
            h-4 w-2 rounded-l-sm
            ${active ? "bg-blue-100" : "bg-slate-100"}
          `}
        ></div>
      </div>
    </div>
  </div>
);

const TH = ({ text }) => <th className="px-6 py-3 text-left">{text}</th>;

const TD = ({ children, className }) => (
  <td className={`px-6 py-3 border-b border-slate-100 ${className}`}>
    {children}
  </td>
);

// PREVIEW PANEL
const PreviewPanel = ({ posting, onSaveEdit, setSelectedPosting }) => {
  const [activeTab, setActiveTab] = useState("Description");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // ⏱ Sync editFormData with selected posting when modal opens
  useEffect(() => {
    if (isEditModalOpen && posting) {
      setEditFormData({
        job_code: posting.job_code || "",
        position_title: posting.position_title || "",
        department: posting.department || "",
        account: posting.account || "",
        workSetup: posting.workSetup || "",
        status: posting.status || "Open",
        job_description: posting.job_description || "",
        job_requirements: posting.job_requirements || "",
      });
    }
  }, [isEditModalOpen, posting]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditFormData((prev) => {
      // If changing department to non-account, clear account
      if (
        name === "department" &&
        !["Operations", "DREAM", "GSD"].includes(value)
      ) {
        return {
          ...prev,
          department: value,
          account: "", // clear account here
        };
      }

      // If account is changed to empty string, keep as ""
      if (name === "account" && value === "N/A") {
        return {
          ...prev,
          account: "", // treat "N/A" as empty string
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <h3 className="text-lg font-semibold mb-2">{posting.position_title}</h3>
      <div className="text-xs uppercase text-slate-500 font-bold mb-4">
        {posting.job_code}
      </div>

      {/* Scrollable Info Section */}
      <div
        className="space-y-3 overflow-auto pr-2 flex-1 pb-24"
        key={posting.id}
      >
        {/* Horizontal: Department & Account */}
        <div className="flex gap-6">
          <Info label="Department" value={posting.department} />
          <Info label="Account" value={posting.account} />
        </div>

        <div className="flex gap-11">
          {/* Status & Created */}
          <Info label="Status" value={<StatusChip status={posting.status} />} />
          <Info
            label="Created"
            value={formatShortDate(posting.created_datetime)}
          />
        </div>
        {/* Tabs Section */}
        <div>
          <p className="text-[11px] uppercase text-slate-500 font-semibold mb-2">
            Details
          </p>

          {/* Horizontal Tabs */}
          <div className="border-b border-slate-200 mb-2 flex gap-6">
            {["Description", "Requirements"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-sm pb-2 transition font-medium ${
                  activeTab === tab
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-500 hover:text-blue-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content — NOT scrollable */}
          <div className="mb-10 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
            {activeTab === "Description"
              ? posting.job_description || "—"
              : posting.job_requirements || "—"}
          </div>
        </div>

        <button
          onClick={() => {
            setEditFormData({
              position_title: posting.position_title || "",
              department: posting.department || "",
              account: posting.account || "",
              workSetup: posting.workSetup || "",
              status: posting.status || "Open",
              job_description: posting.job_description || "",
              job_requirements: posting.job_requirements || "",
            });
            setIsEditModalOpen(true);
          }}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm"
        >
          Edit Job Posting
        </button>
      </div>

      {/* Fixed footer button */}
      <div className="pt-4 border-t mt-4"></div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[480px] relative">
            <h2 className="text-lg font-semibold mb-4">Edit Job Posting</h2>

            {/* Close Button */}
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-3 right-4 text-slate-500 hover:text-red-500"
            >
              ✕
            </button>

            <form
              className="space-y-4 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                onSaveEdit(editFormData, posting.id);
                setIsEditModalOpen(false);
              }}
            >
              {/* Job Code */}
              <div>
                <label className="block font-medium mb-1">Job Code: </label>
                <input
                  type="text"
                  name="job_code"
                  value={editFormData["job_code"] || ""}
                  onChange={handleEditChange}
                  disabled
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Position Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="position_title"
                  value={editFormData.position_title}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="department"
                  value={editFormData.department}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select</option>
                  <option value="Operations">Operations</option>
                  <option value="Accounting">Accounting</option>
                  <option value="Client Services">Client Services</option>
                  <option value="DREAM">DREAM</option>
                  <option value="Facilities">Facilities</option>
                  <option value="GSD">GSD</option>
                  <option value="HRAD">HRAD</option>
                  <option value="IT">IT</option>
                  <option value="Ops Support">Ops Support</option>
                  <option value="Recruitment">Recruitment</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Account <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="account"
                  value={editFormData.account}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Work Setup <span className="text-red-500">*</span>
                </label>
                <select
                  name="workSetup"
                  value={editFormData.workSetup}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">— Select Setup —</option>
                  <option value="Onsite">Onsite</option>
                  <option value="WFH">WFH</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={editFormData.status}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="job_description"
                  value={editFormData.job_description}
                  onChange={handleEditChange}
                  rows={4}
                  className="w-full border rounded px-3 py-2 resize-none overflow-y-auto"
                  required
                />
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Requirements <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="job_requirements"
                  value={editFormData.job_requirements}
                  onChange={handleEditChange}
                  rows={4}
                  className="w-full border rounded px-3 py-2 resize-none overflow-y-auto"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Info = ({ label, value }) => (
  <div>
    <p className="text-[11px] uppercase text-slate-500 font-semibold mb-1">
      {label}
    </p>
    <div className="text-sm text-slate-700 whitespace-pre-line">{value}</div>
  </div>
);
