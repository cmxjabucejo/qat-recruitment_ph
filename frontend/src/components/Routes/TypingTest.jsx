import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DateRange } from "react-date-range";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

import searchIcon from "../../assets/search_symbol.png";
import downloadIcon from "../../assets/download_icon.png";
import SidebarIcons from "../../components/common/Sidebar"; // your modular icon-based sidebar
import { SERVER_URL } from "../lib/constants";
import Header from "../../components/common/Header"; // ✅ Import the new reusable Header

import axios from "axios";

export default function TypingTest({ user }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: null,
      endDate: null,
      key: "selection",
    },
  ]);

  const [selectedRowIndex, setSelectedRowIndex] = useState(null);

  const handleLogout = () => {
    try {
      localStorage.clear();
      navigate("/OauthLogin");
    } catch (error) {
      console.error("Logout Error:", error);
      alert("Logout failed. Please try again.");
    }
  };

  // ✅ FIX: declare user info BEFORE JSX return
  const userName = user.fullName || localStorage.getItem("name") || "User";
  const userid = user.userid || localStorage.getItem("userid") || "";

  const fetchData = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/assessments/typing-results`);
      setRows(res.data);
      setFilteredRows(res.data);
    } catch (err) {
      console.error("Error fetching typing test data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtering logic
  useEffect(() => {
    const q = searchQuery.toLowerCase();
    const { startDate, endDate } = dateRange[0];

    const filtered = rows.filter((r) => {
      const matchesQuery = Object.values(r).some((val) =>
        val?.toString().toLowerCase().includes(q),
      );

      const createdDate = new Date(r.CREATED_AT);
      const inRange =
        (!startDate || createdDate >= startDate) &&
        (!endDate || createdDate <= endDate);

      return matchesQuery && inRange;
    });

    setFilteredRows(filtered);
  }, [searchQuery, rows, dateRange]);

  const formatRangeLabel = () => {
    const { startDate, endDate } = dateRange[0];
    if (!startDate || !endDate) return "Select Date Range";
    return `${format(startDate, "MMM dd, yyyy")} - ${format(
      endDate,
      "MMM dd, yyyy",
    )}`;
  };

  const handleExport = () => {
    if (!rows.length) return;

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TypingResults");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });

    const fileName = `TypingTestResults_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    saveAs(blob, fileName);
  };

  // Calculate Analytics for Total Entries, Average Accuracy, Average Net speed

  const totalEntries = filteredRows.length;

  const averageAccuracy = totalEntries
    ? (
        filteredRows.reduce(
          (sum, row) => sum + parseFloat(row.ACCURACY || 0),
          0,
        ) / totalEntries
      ).toFixed(2)
    : "—";

  const averageNetSpeed = totalEntries
    ? (
        filteredRows.reduce(
          (sum, row) => sum + parseFloat(row.NET_SPEED || 0),
          0,
        ) / totalEntries
      ).toFixed(2)
    : "—";

  // Top Net Speed
  const topNetSpeedRow = filteredRows.reduce((max, row) => {
    const speed = parseFloat(row.NET_SPEED || 0);
    return speed > parseFloat(max.NET_SPEED || 0) ? row : max;
  }, {});

  const topNetSpeed = topNetSpeedRow.NET_SPEED
    ? `${topNetSpeedRow.NET_SPEED} WPM (${topNetSpeedRow.CANDIDATENAME || "—"})`
    : "—";

  // Top Accuracy
  const topAccuracyRow = filteredRows.reduce((max, row) => {
    const accuracy = parseFloat(row.ACCURACY || 0);
    return accuracy > parseFloat(max.ACCURACY || 0) ? row : max;
  }, {});

  const topAccuracy = topAccuracyRow.ACCURACY
    ? `${parseFloat(topAccuracyRow.ACCURACY).toFixed(2)}% (${
        topAccuracyRow.CANDIDATENAME || "—"
      })`
    : "—";

  return (
    <div className="w-full min-h-screen bg-slate-50 flex text-slate-900">
      {/* Sidebar */}
      <SidebarIcons />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header
          userName={userName}
          userid={userid}
          onLogoutClick={() => setIsLogoutModalVisible(true)}
          pageTitle="Typing Test"
        />

        {/* Main Content Area (Filters + Table + Preview) */}
        <div className="flex flex-1 flex-row overflow-hidden">
          {/* Left side: Filters + Table */}
          <div className="flex-1 flex flex-col px-6 pb-6">
            {/* Analytics Cards */}
            {/* <div className="flex flex-wrap gap-4 pt-6">
              <AnalyticsCard label="Total Entries" value={totalEntries} />
              <AnalyticsCard
                label="Average Accuracy"
                value={`${averageAccuracy}%`}
              />
              <AnalyticsCard
                label="Average Net Speed"
                value={`${averageNetSpeed} WPM`}
              />
              <AnalyticsCard label="Top Net Speed" value={topNetSpeed} />
              <AnalyticsCard label="Top Accuracy" value={topAccuracy} />
            </div> */}

            {/* Filters Row */}
            <div className="flex items-center gap-2 pt-4 mb-2">
              {/* Search Field */}
              <div className="relative w-[300px]">
                <input
                  type="text"
                  placeholder="Search candidate, ID, etc."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                />
                <img
                  src={searchIcon}
                  alt="Search"
                  className="w-4 opacity-60 absolute left-3 top-1/2 -translate-y-1/2"
                />
              </div>

              {/* Date Range Toggle Button & Clear Button */}
              <div className="relative inline-block">
                {/* Toggle + Clear Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowCalendar((prev) => !prev)}
                    className="text-sm px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-300 outline-none"
                  >
                    {formatRangeLabel()}
                  </button>

                  {dateRange[0].startDate && dateRange[0].endDate && (
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
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Date Picker - positioned to the right */}
                {showCalendar && (
                  <div className="absolute top-full left-full ml-2 z-50">
                    <div className="bg-white border border-slate-200 shadow-md rounded-xl inline-block">
                      <DateRange
                        editableDateInputs={true}
                        onChange={(item) => setDateRange([item.selection])}
                        moveRangeOnFirstSelection={false}
                        ranges={dateRange}
                        maxDate={new Date()}
                        locale={enUS}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto max-h-[calc(100vh-200px)] mt-2">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[11px] sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Applicant ID</th>
                    <th className="px-6 py-3">Candidate Name</th>
                    <th className="px-6 py-3">Position</th>
                    <th className="px-6 py-3">WPM</th>
                    <th className="px-6 py-3">Typos</th>
                    <th className="px-6 py-3">Accuracy</th>
                    <th className="px-6 py-3">Net Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`cursor-pointer transition-colors ${
                        selectedRowIndex === idx
                          ? "bg-blue-50"
                          : "hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        setSelectedRowIndex(idx);
                        setSelectedResult(row); // optional: keep for preview
                      }}
                    >
                      <td className="px-6 py-3">
                        {row.CREATED_AT
                          ? format(new Date(row.CREATED_AT), "MMM dd, yyyy")
                          : "—"}
                      </td>
                      <td className="px-6 py-3 font-semibold">
                        {row.APPLICANTID || "—"}
                      </td>
                      <td className="px-6 py-3">
                        {(row.CANDIDATENAME || "—").toUpperCase()}
                      </td>
                      <td className="px-6 py-3">
                        {row.POSITION_APPLIED || "—"}
                      </td>
                      <td className="px-6 py-3">{row.WPM || "—"}</td>
                      <td className="px-6 py-3">{row.TYPOS || "—"}</td>
                      <td className="px-6 py-3">
                        {row.ACCURACY
                          ? `${parseFloat(row.ACCURACY).toFixed(2)}%`
                          : "—"}
                      </td>
                      <td className="px-6 py-3 font-semibold">
                        {row.NET_SPEED || "—"} WPM
                      </td>
                    </tr>
                  ))}

                  {!filteredRows.length && (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center text-slate-400 py-6"
                      >
                        No results found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="w-[350px] bg-white border-l border-slate-200 shadow-xl p-6 overflow-auto">
            {selectedResult ? (
              <>
                <h2 className="text-lg font-semibold mb-1">
                  {selectedResult.CANDIDATENAME?.toUpperCase() || "—"}
                </h2>
                <p className="text-xs text-slate-500 uppercase mb-4">
                  ID: {selectedResult.APPLICANTID || "—"}
                </p>

                <div className="space-y-3">
                  <PreviewItem
                    label="Position"
                    value={selectedResult.POSITION_APPLIED}
                  />
                  <PreviewItem label="WPM" value={selectedResult.WPM} />
                  <PreviewItem label="Typos" value={selectedResult.TYPOS} />
                  <PreviewItem
                    label="Accuracy"
                    value={
                      selectedResult.ACCURACY
                        ? `${parseFloat(selectedResult.ACCURACY).toFixed(2)}%`
                        : "—"
                    }
                  />
                  <PreviewItem
                    label="Net Speed"
                    value={`${selectedResult.NET_SPEED} WPM`}
                  />
                  <PreviewItem
                    label="Date"
                    value={
                      selectedResult.CREATED_AT
                        ? new Date(selectedResult.CREATED_AT).toLocaleString(
                            "en-US",
                          )
                        : "—"
                    }
                  />
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Select a row to preview result
              </div>
            )}
          </div>
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
  );
}

const PreviewItem = ({ label, value }) => (
  <div>
    <p className="text-[11px] uppercase text-slate-500 font-semibold mb-1">
      {label}
    </p>
    <p className="text-sm text-slate-800">{value || "—"}</p>
  </div>
);

const AnalyticsCard = ({ label, value }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4 min-w-[180px]">
    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
      {label}
    </p>
    <p className="text-lg text-slate-800 font-bold">{value}</p>
  </div>
);
