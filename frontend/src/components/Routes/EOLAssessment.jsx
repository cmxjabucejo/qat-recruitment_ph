import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DateRange } from "react-date-range";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

import Sidebar from "../common/Sidebar";
import { SERVER_URL } from "../lib/constants";
import searchIcon from "../../assets/search_symbol.png";
import downloadIcon from "../../assets/download_icon.png";
import Header from "../../components/common/Header"; // ✅ Import the new reusable Header

ChartJS.register(ArcElement, Tooltip, Legend);

export default function EOLAssessment({ user }) {
  const navigate = useNavigate();
  const tableRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null); // ✅ new
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [dateRange, setDateRange] = useState([
    { startDate: null, endDate: null, key: "selection" },
  ]);
  const [showCalendar, setShowCalendar] = useState(false);

  const handleLogout = () => {
    try {
      localStorage.clear();
      navigate("/OauthLogin");
    } catch (error) {
      console.error("Logout Error:", error);
      alert("Logout failed. Please try again.");
    }
  };

  {
    /* Utility to format the button label */
  }
  const formatRangeLabel = () => {
    const { startDate, endDate } = dateRange[0];
    if (!startDate || !endDate) return "Select Date Range";
    return `${format(startDate, "MMM dd, yyyy")} - ${format(endDate, "MMM dd, yyyy")}`;
  };

  // ✅ FIX: declare user info BEFORE JSX return
  const userName = user.fullName || localStorage.getItem("name") || "User";
  const userid = user.userid || localStorage.getItem("userid") || "";

  /* ===================== DATA ===================== */
  const fetchData = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/assessments/eol-assessment`, {
        withCredentials: true,
      });
      setRows(res.data);
      setFilteredRows(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ===================== FILTER ===================== */
  useEffect(() => {
    const q = searchQuery.toLowerCase();
    const { startDate, endDate } = dateRange[0];

    const filtered = rows.filter((r) => {
      const matchesSearch = Object.values(r).some((val) =>
        val?.toString().toLowerCase().includes(q),
      );

      const d = new Date(r.assessment_date);
      const inRange =
        (!startDate || d >= startDate) && (!endDate || d <= endDate);

      return matchesSearch && inRange;
    });

    setFilteredRows(filtered);
  }, [searchQuery, rows, dateRange]);

  /* ===================== ANALYTICS ===================== */

  const totalEntries = filteredRows.length;

  // Average English Score
  const averageEnglishScore = totalEntries
    ? (
        filteredRows.reduce(
          (sum, r) => sum + parseFloat(r.overall_score || 0),
          0,
        ) / totalEntries
      ).toFixed(4) * 100 // Convert to percentage
    : 0;

  // Average Email Etiquette Score
  const averageEmailScore = totalEntries
    ? (
        filteredRows.reduce(
          (sum, r) => sum + parseFloat(r.overall_email_score || 0),
          0,
        ) / totalEntries
      ).toFixed(4) * 100
    : 0;

  // English Passed/Failed
  const passedEnglish = filteredRows.filter(
    (r) => r.remarks?.toLowerCase() === "passed",
  ).length;
  const failedEnglish = totalEntries - passedEnglish;

  // Email Passed/Failed
  const passedEmail = filteredRows.filter(
    (r) =>
      r.email_remarks?.toLowerCase() === "passed" ||
      r.email_remarks?.toLowerCase() === "pass",
  ).length;
  const failedEmail = totalEntries - passedEmail;

  // Percentages
  const percentagePassedEnglish = totalEntries
    ? ((passedEnglish / totalEntries) * 100).toFixed(2)
    : "0.00";
  const percentageFailedEnglish = totalEntries
    ? ((failedEnglish / totalEntries) * 100).toFixed(2)
    : "0.00";

  const percentagePassedEmail = totalEntries
    ? ((passedEmail / totalEntries) * 100).toFixed(2)
    : "0.00";

  const percentageFailedEmail = totalEntries
    ? ((failedEmail / totalEntries) * 100).toFixed(2)
    : "0.00";

  //Overall Passed and Failed
  const averageOverallScore = totalEntries
    ? (
        filteredRows.reduce((sum, r) => {
          const eng = parseFloat(r.overall_score || 0);
          const email = parseFloat(r.overall_email_score || 0);
          return sum + (eng + email) / 2;
        }, 0) / totalEntries
      ).toFixed(4) * 100
    : 0;

  const passedOverall = filteredRows.filter((r) => {
    const eng = parseFloat(r.overall_score || 0);
    const email = parseFloat(r.overall_email_score || 0);
    return (eng + email) / 2 >= 0.75;
  }).length;

  const percentagePassedOverall = totalEntries
    ? ((passedOverall / totalEntries) * 100).toFixed(2)
    : "0.00";

  const failedOverall = totalEntries - passedOverall;
  const percentageFailedOverall = totalEntries
    ? ((failedOverall / totalEntries) * 100).toFixed(2)
    : "0.00";

  // Top English and Top Email

  const topEnglish = filteredRows.reduce(
    (max, r) => ((r.overall_score || 0) > (max.overall_score || 0) ? r : max),
    {},
  );

  const topEmail = filteredRows.reduce(
    (max, r) =>
      (r.overall_email_score || 0) > (max.overall_email_score || 0) ? r : max,
    {},
  );

  /* ===================== EXPORT ===================== */
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EOLAssessment");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "EOL_Assessment.xlsx");
  };

  /* ===================== UI ===================== */
  return (
    <div className="w-full min-h-screen bg-slate-50 flex text-slate-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header
          userName={userName}
          userid={userid}
          onLogoutClick={() => setIsLogoutModalVisible(true)}
          pageTitle="EOL Assessment"
        />
        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Table + Filters */}
          <div className="flex-1 flex flex-col px-6 pb-6">
            {/* ====== Analytics Section (Single Row Layout) ====== */}
            <div
              className="flex gap-4 pt-4 overflow-x-auto pb-2"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {/* 📋 Compact Text Analytics */}
              <div className="flex gap-2 items-start">
                <AnalyticsCard label="Total" value={totalEntries} />
                <AnalyticsCard
                  label="English Pass"
                  value={`${passedEnglish} (${percentagePassedEnglish}%)`}
                />
                <AnalyticsCard
                  label="English Fail"
                  value={`${failedEnglish} (${percentageFailedEnglish}%)`}
                />
                <AnalyticsCard
                  label="Email Pass"
                  value={`${passedEmail} (${percentagePassedEmail}%)`}
                />
                <AnalyticsCard
                  label="Email Fail"
                  value={`${failedEmail} (${percentageFailedEmail}%)`}
                />
              </div>

              {/* 📊 Chart-Based Analytics */}
              <div className="flex gap-4 items-start">
                <div className="bg-white rounded-lg px-3 py-2 shadow-sm min-w-[280px]">
                  <h3 className="text-[11px] font-semibold mb-2">
                    Pass vs Fail Overview
                  </h3>
                  <StackedBarChart
                    data={[
                      {
                        category: "English",
                        passed: passedEnglish,
                        failed: failedEnglish,
                      },
                      {
                        category: "Email",
                        passed: passedEmail,
                        failed: failedEmail,
                      },
                      {
                        category: "Overall",
                        passed: passedOverall,
                        failed: failedOverall,
                      },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 items-center mt-4">
              <div className="relative w-[330px]">
                <input
                  className="w-full pl-10 py-2 rounded border"
                  placeholder="Search candidate, position, score..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <img
                  src={searchIcon}
                  className="w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60"
                  alt="search"
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
            <div className="mt-4 bg-white rounded border overflow-auto max-h-[calc(100vh-280px)]">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Candidate</th>
                    <th className="px-6 py-3">Position</th>
                    <th className="px-6 py-3">Attempt</th>
                    <th className="px-6 py-3">Grammar</th>
                    <th className="px-6 py-3">Reading</th>
                    <th className="px-6 py-3">Sentence</th>
                    <th className="px-6 py-3">English Score</th>
                    <th className="px-6 py-3">Remarks</th>
                    <th className="px-6 py-3">Email Etiquette</th>
                    <th className="px-6 py-3">Email Remarks</th>
                    <th className="px-6 py-3">Overall Rate</th>
                    <th className="px-6 py-3">Overall Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row, i) => (
                      <tr
                        key={i}
                        className={`cursor-pointer transition-colors ${
                          selectedRowIndex === i
                            ? "bg-blue-50"
                            : "hover:bg-slate-50"
                        }`}
                        onClick={() => {
                          setSelectedRow(row);
                          setSelectedRowIndex(i); // ✅ track row index
                        }}
                      >
                        <td className="px-6 py-3">
                          {row.assessment_date
                            ? format(
                                new Date(row.assessment_date),
                                "MMM dd, yyyy",
                              )
                            : "—"}
                        </td>
                        <td className="px-6 py-3 font-semibold">
                          {(row.candidatename || "—").toUpperCase()}
                        </td>
                        <td className="px-6 py-3">
                          {row.applied_position_title || "—"}
                        </td>
                        <td className="px-6 py-3">{row.attempt_no || "—"}</td>
                        <td className="px-6 py-3">
                          {row.grammar_score != null
                            ? `${(row.grammar_score * 100).toFixed(2)}%`
                            : "—"}
                        </td>
                        <td className="px-6 py-3">
                          {row.reading_score != null
                            ? `${(row.reading_score * 100).toFixed(2)}%`
                            : "—"}
                        </td>
                        <td className="px-6 py-3">
                          {row.sentence_score != null
                            ? `${(row.sentence_score * 100).toFixed(2)}%`
                            : "—"}
                        </td>
                        <td className="px-6 py-3">
                          {row.overall_score != null
                            ? `${(row.overall_score * 100).toFixed(2)}%`
                            : "—"}
                        </td>
                        <td className="px-6 py-3">{row.remarks || "—"}</td>
                        <td className="px-6 py-3">
                          {row.overall_email_score != null
                            ? `${(row.overall_email_score * 100).toFixed(2)}%`
                            : "—"}
                        </td>
                        <td className="px-6 py-3">
                          {row.email_remarks || "—"}
                        </td>
                        <td className="px-6 py-3 font-bold">
                          {row.overall_score != null &&
                          row.overall_email_score != null
                            ? `${(
                                ((row.overall_score + row.overall_email_score) /
                                  2) *
                                100
                              ).toFixed(2)}%`
                            : "—"}
                        </td>
                        <td className="px-6 py-3 font-bold">
                          {row.overall_score != null &&
                          row.overall_email_score != null
                            ? (row.overall_score + row.overall_email_score) /
                                2 >=
                              0.75
                              ? "Passed"
                              : "Failed"
                            : "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="11"
                        className="text-center py-6 text-slate-400"
                      >
                        No results found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Preview Panel */}
          <div className="w-[350px] bg-white border-l shadow-xl p-6 overflow-auto">
            {selectedRow ? (
              <>
                <h2 className="text-lg font-semibold mb-1">
                  {selectedRow.candidatename?.toUpperCase()}
                </h2>
                <p className="text-xs text-slate-500 uppercase mb-4">
                  ID: {selectedRow.applicantid || "—"}
                </p>

                <div className="space-y-3">
                  <PreviewItem
                    label="Position"
                    value={selectedRow.applied_position_title}
                  />
                  <PreviewItem
                    label="Attempt No"
                    value={selectedRow.attempt_no}
                  />
                  <PreviewItem
                    label="Grammar Score"
                    value={`${(selectedRow.grammar_score * 100).toFixed(2)}%`}
                  />
                  <PreviewItem
                    label="Reading Score"
                    value={`${(selectedRow.reading_score * 100).toFixed(2)}%`}
                  />
                  <PreviewItem
                    label="Sentence Score"
                    value={`${(selectedRow.sentence_score * 100).toFixed(2)}%`}
                  />
                  <PreviewItem
                    label="English Score"
                    value={`${(selectedRow.overall_score * 100).toFixed(2)}%`}
                  />
                  <PreviewItem label="Remarks" value={selectedRow.remarks} />
                  <PreviewItem
                    label="Email Etiquette"
                    value={`${(selectedRow.overall_email_score * 100).toFixed(
                      2,
                    )}%`}
                  />
                  <PreviewItem
                    label="Email Remarks"
                    value={selectedRow.email_remarks}
                  />
                  <PreviewItem
                    label="Date"
                    value={
                      selectedRow.assessment_date
                        ? format(
                            new Date(selectedRow.assessment_date),
                            "MMM dd, yyyy",
                          )
                        : "—"
                    }
                  />
                  <PreviewItem
                    label="Overall Rate"
                    value={
                      selectedRow.overall_score != null &&
                      selectedRow.overall_email_score != null
                        ? `${(
                            ((selectedRow.overall_score +
                              selectedRow.overall_email_score) /
                              2) *
                            100
                          ).toFixed(2)}%`
                        : "—"
                    }
                  />
                  <PreviewItem
                    label="Overall Remarks"
                    value={
                      selectedRow.overall_score != null &&
                      selectedRow.overall_email_score != null
                        ? (selectedRow.overall_score +
                            selectedRow.overall_email_score) /
                            2 >=
                          0.75
                          ? "Passed"
                          : "Failed"
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

/* Components */
const AnalyticsCard = ({ label, value }) => (
  <div
    className="
      bg-white border rounded-lg
      px-3 py-2
      shadow-sm
      min-w-[120px]
      h-[165px]  /* Fixed height to align with charts */
      flex flex-col justify-center
    "
  >
    <span className="text-[9px] uppercase text-slate-500 font-medium leading-none text-center">
      {label}
    </span>
    <span className="text-[13px] font-semibold text-slate-800 leading-none text-center mt-1">
      {value}
    </span>
  </div>
);

const PreviewItem = ({ label, value }) => (
  <div>
    <p className="text-[11px] uppercase text-slate-500 font-semibold mb-1">
      {label}
    </p>
    <p className="text-sm text-slate-800">{value || "—"}</p>
  </div>
);

const RadialChart = ({ value = 0, label = "Score" }) => {
  const data = {
    datasets: [
      {
        data: [value, 100 - value],
        backgroundColor: ["#3B82F6", "#E5E7EB"], // Blue & Gray
        borderWidth: 0,
      },
    ],
    labels: [label, "Remaining"],
  };

  const options = {
    cutout: "70%",
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 12,
          padding: 10,
        },
      },
    },
  };

  return (
    <div className="relative w-32 h-32 mx-auto">
      <Doughnut data={data} options={options} />

      {/* Center Label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-blue-600 font-bold text-lg">
          {value.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

const StackedBarChart = ({ data }) => (
  <div className="w-full space-y-4">
    {data.map((item, idx) => {
      const total = item.passed + item.failed || 1;
      const passPercent = Math.round((item.passed / total) * 100);
      const failPercent = 100 - passPercent;

      return (
        <div key={idx}>
          <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>{item.category}</span>
            <span>{passPercent}% Passed</span>
          </div>

          <div className="h-4 w-full rounded-full overflow-hidden bg-slate-200 flex">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${passPercent}%` }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${failPercent}%` }}
            />
          </div>
        </div>
      );
    })}
  </div>
);
