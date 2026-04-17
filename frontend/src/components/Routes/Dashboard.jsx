import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "../lib/constants";
import Sidebar from "../common/Sidebar";
import Header from "../common/Header";
import Footer from "../common/Footer";
import { DateRange } from "react-date-range";
import { format } from "date-fns";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

import { PieChart, Pie, Cell, Tooltip as RechartsTooltip } from "recharts";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/* ================== CONSTANTS ================== */
const statusColors = {
  "Active Application": "#0541fb",
  "Successful Hire": "#009519",
  Failed: "#d92b00",
  Reprofiled: "#5f00d9",
  "Cancelled Application": "#c900d9",
  "Pooling Discontinued": "#d9ae00",
  "Training Fallout / Resigned": "#900C3F",
};

const departments = [
  "Operations",
  "Accounting",
  "Client Services",
  "DREAM",
  "Facilities",
  "GSD",
  "HRAD",
  "IT",
  "Ops Support",
  "Recruitment",
];

const userName = localStorage.getItem("name") || "User";
const userid = localStorage.getItem("userid") || "";

const Dashboard = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const [filters, setFilters] = useState({
    gender: "All",
    candidatesource: "All",
    candidatetype: "All",
    applied_role: "All",
    profiled_account: "All",
    recruiter: "All",
    applied_position_title: [],
  });

  const [dateRange, setDateRange] = useState([
    {
      startDate: null,
      endDate: null,
      key: "selection",
    },
  ]);

  const [showCalendar, setShowCalendar] = useState(false);

  const [filterOptions, setFilterOptions] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState("All");

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

  /* ================== FETCH DATA ================== */
  useEffect(() => {
    setLoading(true);
    fetch(`${SERVER_URL}/api/applicantsList`)
      .then((res) => res.json())
      .then((resData) => {
        const rawData = resData.data || [];

        // No need to compute 'month' anymore — just use raw data
        setRows(rawData);

        // Set filter options for dropdowns (excluding 'month')
        setFilterOptions({
          gender: [...new Set(rawData.map((d) => d.gender).filter(Boolean))],
          candidatesource: [
            ...new Set(rawData.map((d) => d.candidatesource).filter(Boolean)),
          ],
          candidatetype: [
            ...new Set(rawData.map((d) => d.candidatetype).filter(Boolean)),
          ],
          applied_role: [
            ...new Set(rawData.map((d) => d.applied_role).filter(Boolean)),
          ],
          profiled_account: [
            ...new Set(rawData.map((d) => d.profiled_account).filter(Boolean)),
          ],
          recruiter: [
            ...new Set(rawData.map((d) => d.recruiter).filter(Boolean)),
          ],
          applied_position_title: [
            ...new Set(
              rawData.map((d) => d.applied_position_title).filter(Boolean),
            ),
          ],
        });
      })
      .catch((err) => {
        console.error("Error fetching applicants list:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  /* ================== FILTERED ROWS ================== */
  const filteredRows = useMemo(() => {
    const { startDate, endDate } = dateRange[0];

    return rows.filter((r) => {
      const rowDate = r.applicationdatetime
        ? new Date(r.applicationdatetime)
        : null;

      const inRange =
        (!startDate || (rowDate && rowDate >= startDate)) &&
        (!endDate || (rowDate && rowDate <= endDate));

      return (
        inRange &&
        (selectedDepartment === "All" || r.department === selectedDepartment) &&
        (filters.gender === "All" || r.gender === filters.gender) &&
        (filters.candidatesource === "All" ||
          r.candidatesource === filters.candidatesource) &&
        (filters.candidatetype === "All" ||
          r.candidatetype === filters.candidatetype) &&
        (filters.applied_role === "All" ||
          r.applied_role === filters.applied_role) &&
        (filters.profiled_account === "All" ||
          r.profiled_account === filters.profiled_account) &&
        (filters.recruiter === "All" || r.recruiter === filters.recruiter) &&
        (filters.applied_position_title.length === 0 ||
          filters.applied_position_title.includes(r.applied_position_title))
      );
    });
  }, [rows, filters, selectedDepartment, dateRange]);

  /* ================== METRICS ================== */
  const countStatus = (status) =>
    filteredRows.filter((r) => r.overall_status === status).length;

  const applicationCount = filteredRows.length;
  const successfulHire = countStatus("Successful Hire");
  const forReprofile = countStatus("Reprofiled");
  const cancelledApplication = countStatus("Cancelled Application");
  const discontinuedPooling = countStatus("Pooling Discontinued");
  const fallout = countStatus("Training Fallout / Resigned");

  const overallStatusData = Object.keys(statusColors).map((status) => ({
    name: status,
    value: countStatus(status),
  }));

  /* ================== RECRUITER PERFORMANCE ================== */
  const recruiterStats = useMemo(() => {
    const map = {};

    filteredRows.forEach((r) => {
      const recruiter = r.recruiter?.trim();

      // 🚫 EXCLUDE invalid recruiters
      if (
        !recruiter ||
        recruiter.toLowerCase() === "null" ||
        recruiter.toLowerCase() === "unknown"
      ) {
        return;
      }

      if (!map[recruiter]) {
        map[recruiter] = { total: 0, hires: 0 };
      }

      map[recruiter].total += 1;

      if (r.overall_status === "Successful Hire") {
        map[recruiter].hires += 1;
      }
    });

    return Object.entries(map).map(([recruiter, v]) => ({
      recruiter,
      total: v.total,
      hires: v.hires,
      rate: ((v.hires / v.total) * 100 || 0).toFixed(1),
    }));
  }, [filteredRows]);

  /* ================== SOURCE PERFORMANCE ================== */
  const sourceStats = useMemo(() => {
    const map = {};
    filteredRows.forEach((r) => {
      if (!r.candidatesource) return;

      if (!map[r.candidatesource]) {
        map[r.candidatesource] = { total: 0, hires: 0 };
      }

      map[r.candidatesource].total += 1;
      if (r.overall_status === "Successful Hire") {
        map[r.candidatesource].hires += 1;
      }
    });

    return Object.entries(map).map(([source, v]) => ({
      source,
      total: v.total,
      hires: v.hires,
      rate: ((v.hires / v.total) * 100 || 0).toFixed(1),
    }));
  }, [filteredRows]);

  /* ================== BAR ================== */
  const chartData = {
    labels: departments,
    datasets: Object.entries(statusColors).map(([status, color]) => ({
      label: status,
      data: departments.map(
        (d) =>
          filteredRows.filter(
            (r) => r.department === d && r.overall_status === status,
          ).length,
      ),
      backgroundColor: color,
    })),
  };

  /* ================== UI ================== */
  return (
    <div className="w-full h-screen bg-gray-100 flex overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          userName={userName}
          userid={userid}
          onLogoutClick={() => setIsLogoutModalVisible(true)}
          pageTitle="Dashboard"
        />

        <div className="flex flex-1 overflow-hidden">
          {/* FILTERS */}
          <aside className="w-[270px] bg-white border-r px-5 py-6 hidden lg:block ">
            <h2 className="text-xs font-semibold text-slate-600 uppercase mb-4">
              Filters
            </h2>

            {/* DATE RANGE FILTER */}
            <div className="relative mb-6">
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

            {Object.keys(filters)
              .filter((k) => k !== "applied_position_title")
              .map((key) => (
                <div key={key} className="mb-5">
                  <label className="text-[11px] uppercase text-slate-500 font-semibold block mb-1">
                    {key.replace(/_/g, " ")}
                  </label>
                  <select
                    className="w-full text-sm px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 
            focus:ring-2 focus:ring-blue-300 outline-none"
                    value={filters[key]}
                    onChange={(e) =>
                      setFilters({ ...filters, [key]: e.target.value })
                    }
                  >
                    <option value="All">All</option>
                    {(filterOptions[key] || []).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

            <div className="mb-5">
              <label className="text-[11px] uppercase text-slate-500 font-semibold block mb-1">
                Applied Position
              </label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50 text-sm space-y-2">
                {(filterOptions.applied_position_title || []).map((pos) => (
                  <label
                    key={pos}
                    className="flex items-center gap-2 text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={filters.applied_position_title.includes(pos)}
                      onChange={() =>
                        setFilters((prev) => ({
                          ...prev,
                          applied_position_title:
                            prev.applied_position_title.includes(pos)
                              ? prev.applied_position_title.filter(
                                  (p) => p !== pos,
                                )
                              : [...prev.applied_position_title, pos],
                        }))
                      }
                    />
                    {pos}
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <main className="flex-1 p-4 overflow-y-auto overscroll-contain">
            <div className="max-w-[1400px] mx-auto space-y-4">
              {/* SUMMARY */}

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {/* Main KPIs */}
                <SummaryCard title="Applications" value={applicationCount} />
                <SummaryCard
                  title="Active"
                  value={countStatus("Active Application")}
                />
                <SummaryCard title="Hired" value={successfulHire} />
                <SummaryCard title="Failed" value={countStatus("Failed")} />

                {/* Other Stats as individual cards */}
                <SummaryCard title="Reprofiled" value={forReprofile} />
                <SummaryCard title="Cancelled" value={cancelledApplication} />
                <SummaryCard title="Discontinued" value={discontinuedPooling} />
                <SummaryCard title="Fallout" value={fallout} />
              </div>

              {/* CHARTS */}
              {/* SECOND ROW – CHARTS + TABLES */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Breakdown */}
                {/* Status Breakdown */}
                <div className="bg-white p-3 rounded shadow">
                  <h2 className="text-sm font-semibold mb-2">
                    Status Breakdown
                  </h2>

                  <div className="flex items-center gap-4">
                    {/* Donut */}
                    <PieChart width={200} height={200}>
                      <Pie
                        data={overallStatusData}
                        dataKey="value"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {overallStatusData.map((e, i) => (
                          <Cell key={i} fill={statusColors[e.name]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>

                    {/* Legend */}
                    <div className="text-xs space-y-1">
                      {overallStatusData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-sm inline-block"
                            style={{ backgroundColor: statusColors[item.name] }}
                          />
                          <span className="truncate max-w-[140px]">
                            {item.name}
                          </span>
                          <span className="font-semibold ml-auto">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Successful Hires Rate*/}
                <div className="bg-white p-4 rounded shadow flex flex-col">
                  {/* Header */}
                  <h2 className="text-sm font-semibold text-left">
                    Successful Hires
                  </h2>

                  {/* Centered & Enlarged Circular Progress */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-36 h-36">
                      <CircularProgressbar
                        value={(successfulHire / applicationCount) * 100 || 0}
                        text={`${(
                          (successfulHire / applicationCount) * 100 || 0
                        ).toFixed(1)}%`}
                        styles={{
                          path: {
                            stroke: "#2563eb", // blue-600
                            strokeLinecap: "round",
                          },
                          trail: {
                            stroke: "#e5e7eb", // gray-200
                          },
                          text: {
                            fill: "#2563eb",
                            fontSize: "18px",
                            fontWeight: "700",
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Recruiter Performance Summary */}
                <div className="bg-white p-3 rounded shadow">
                  <h2 className="text-sm font-semibold mb-2">
                    Recruiter Performance
                  </h2>
                  <div className="max-h-[230px] overflow-y-auto">
                    <Table
                      headers={["Recruiter", "Apps", "Hires", "%"]}
                      rows={recruiterStats.map((r) => [
                        r.recruiter,
                        r.total,
                        r.hires,
                        `${r.rate}%`,
                      ])}
                      compact
                    />
                  </div>
                </div>

                {/* Candidate Sources */}
                <div className="bg-white p-3 rounded shadow">
                  <h2 className="text-sm font-semibold mb-2">
                    Candidate Sources
                  </h2>
                  <div className="max-h-[230px] overflow-y-auto">
                    <Table
                      headers={["Source", "Apps", "Hires", "%"]}
                      rows={sourceStats.map((s) => [
                        s.source,
                        s.total,
                        s.hires,
                        `${s.rate}%`,
                      ])}
                      compact
                    />
                  </div>
                </div>
              </div>

              {/* BAR */}
              <div className="bg-white p-3 rounded shadow">
                <h2 className="text-sm font-semibold mb-2">
                  Status per Department
                </h2>
                <div className="h-[280px]">
                  <Bar
                    data={chartData}
                    options={{ maintainAspectRatio: false }}
                  />
                </div>
              </div>
            </div>
          </main>

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

        {/* <Footer /> */}
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/40">
          <div className="bg-white rounded-xl shadow-lg px-8 py-10 flex flex-col items-center gap-4">
            {/* Segmented Spinner using strokeDasharray */}
            <svg
              className="w-16 h-16 animate-spin text-blue-500"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="70 30"
              />
            </svg>

            {/* Label */}
            <p className="text-sm text-blue-500 tracking-wide font-semibold">
              Loading...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ================== REUSABLE ================== */
const SummaryCard = ({ title, value }) => (
  <div className="bg-white rounded shadow p-3 text-center">
    <p className="text-xs text-gray-500">{title}</p>
    <h2 className="text-xl font-bold text-blue-600">{value}</h2>
  </div>
);

const Table = ({ headers, rows, compact = false }) => (
  <table className={`w-full text-xs ${compact ? "" : "text-sm"}`}>
    <thead>
      <tr className="border-b">
        {headers.map((h) => (
          <th key={h} className="text-left py-1">
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((r, i) => (
        <tr key={i} className="border-b">
          {r.map((c, j) => (
            <td key={j} className="py-1">
              {c}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

export default Dashboard;
