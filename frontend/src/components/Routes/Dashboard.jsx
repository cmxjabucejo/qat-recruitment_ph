import React, { useState, useEffect, useMemo } from "react";
import { SERVER_URL } from "../lib/constants";
import Sidebar from "../common/Sidebar";
import Header from "../common/Header";
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
import { apiFetch } from "../lib/apiFetch";

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

const Dashboard = () => {

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

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

    apiFetch(`${SERVER_URL}/applicants/applicants-list`)
      .then((res) => res.json())
      .then((resData) => {
        const rawData = Array.isArray(resData?.data) ? resData.data : [];

        setRows(rawData);

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
        setRows([]);
        setFilterOptions({});
      })
      .finally(() => setLoading(false));
  }, []);

  /* ================== FILTERED ROWS ================== */
  const filteredRows = useMemo(() => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const { startDate, endDate } = dateRange[0];

    return safeRows.filter((r) => {
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

  /* ================== BAR CHART ================== */
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

  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };

  /* ================== UI ================== */
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header pageTitle="Dashboard" />

        <div className="flex flex-1 overflow-hidden">
          {/* FILTERS */}
          <aside className="hidden w-[270px] border-r bg-white px-5 py-6 lg:block">
            <h2 className="mb-4 text-xs font-semibold uppercase text-slate-600">
              Filters
            </h2>

            {/* DATE RANGE FILTER */}
            <div className="relative mb-6">
              <label className="block text-[11px] font-semibold uppercase text-slate-500">
                Date Range
              </label>

              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCalendar((prev) => !prev)}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {formatRangeLabel()}
                </button>

                <button
                  type="button"
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
                  className="absolute z-50 mt-2 rounded-xl border border-slate-200 bg-white shadow-lg"
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

            {/* DEPARTMENT FILTER */}
            <div className="mb-5">
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                Department
              </label>

              <select
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="All">All</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>

            {Object.keys(filters)
              .filter((k) => k !== "applied_position_title")
              .map((key) => (
                <div key={key} className="mb-5">
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                    {key.replace(/_/g, " ")}
                  </label>

                  <select
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
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
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                Applied Position
              </label>

              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
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
          <main className="flex-1 overflow-y-auto overscroll-contain p-4">
            <div className="mx-auto max-w-[1400px] space-y-4">
              {/* SUMMARY */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                <SummaryCard title="Applications" value={applicationCount} />
                <SummaryCard
                  title="Active"
                  value={countStatus("Active Application")}
                />
                <SummaryCard title="Hired" value={successfulHire} />
                <SummaryCard title="Failed" value={countStatus("Failed")} />
                <SummaryCard title="Reprofiled" value={forReprofile} />
                <SummaryCard title="Cancelled" value={cancelledApplication} />
                <SummaryCard title="Discontinued" value={discontinuedPooling} />
                <SummaryCard title="Fallout" value={fallout} />
              </div>

              {/* CHARTS */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Status Breakdown */}
                <div className="rounded bg-white p-3 shadow">
                  <h2 className="mb-2 text-sm font-semibold">
                    Status Breakdown
                  </h2>

                  <div className="flex items-center gap-4">
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

                    <div className="space-y-1 text-xs">
                      {overallStatusData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-sm"
                            style={{ backgroundColor: statusColors[item.name] }}
                          />

                          <span className="max-w-[140px] truncate">
                            {item.name}
                          </span>

                          <span className="ml-auto font-semibold">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Successful Hires Rate */}
                <div className="flex flex-col rounded bg-white p-4 shadow">
                  <h2 className="text-left text-sm font-semibold">
                    Successful Hires
                  </h2>

                  <div className="flex flex-1 items-center justify-center">
                    <div className="h-36 w-36">
                      <CircularProgressbar
                        value={(successfulHire / applicationCount) * 100 || 0}
                        text={`${(
                          (successfulHire / applicationCount) * 100 || 0
                        ).toFixed(1)}%`}
                        styles={{
                          path: {
                            stroke: "#2563eb",
                            strokeLinecap: "round",
                          },
                          trail: {
                            stroke: "#e5e7eb",
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
                <div className="rounded bg-white p-3 shadow">
                  <h2 className="mb-2 text-sm font-semibold">
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
                <div className="rounded bg-white p-3 shadow">
                  <h2 className="mb-2 text-sm font-semibold">
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
              <div className="rounded bg-white p-3 shadow">
                <h2 className="mb-2 text-sm font-semibold">
                  Status per Department
                </h2>

                <div className="h-[280px]">
                  <Bar data={chartData} options={chartOptions} />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white px-8 py-10 shadow-lg">
            <svg
              className="h-16 w-16 animate-spin text-blue-500"
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

            <p className="text-sm font-semibold tracking-wide text-blue-500">
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
  <div className="rounded bg-white p-3 text-center shadow">
    <p className="text-xs text-gray-500">{title}</p>
    <h2 className="text-xl font-bold text-blue-600">{value}</h2>
  </div>
);

const Table = ({ headers, rows, compact = false }) => (
  <table className={`w-full text-xs ${compact ? "" : "text-sm"}`}>
    <thead>
      <tr className="border-b">
        {headers.map((h) => (
          <th key={h} className="py-1 text-left">
            {h}
          </th>
        ))}
      </tr>
    </thead>

    <tbody>
      {rows.length > 0 ? (
        rows.map((r, i) => (
          <tr key={i} className="border-b">
            {r.map((c, j) => (
              <td key={j} className="py-1">
                {c}
              </td>
            ))}
          </tr>
        ))
      ) : (
        <tr>
          <td
            className="py-3 text-center text-slate-400"
            colSpan={headers.length}
          >
            No data available
          </td>
        </tr>
      )}
    </tbody>
  </table>
);

export default Dashboard;