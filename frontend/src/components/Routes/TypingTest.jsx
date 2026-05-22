import React, { useState, useEffect } from "react";
import { DateRange } from "react-date-range";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

import searchIcon from "../../assets/search_symbol.png";
import SidebarIcons from "../../components/common/Sidebar";
import Header from "../../components/common/Header";
import { SERVER_URL } from "../lib/constants";
import { apiFetch } from "../lib/apiFetch";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

const normalizeRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.[0])) return payload[0];
  return [];
};

export default function TypingTest() {
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [dateRange, setDateRange] = useState([
    {
      startDate: null,
      endDate: null,
      key: "selection",
    },
  ]);

  const fetchData = async () => {
    setLoading(true);
    setFetchError("");

    try {
      const res = await apiFetch(`${SERVER_URL}/assessments/typing-results`);

      if (!res || !res.ok) {
        throw new Error(`Server responded with ${res?.status || "error"}`);
      }

      const payload = await res.json();
      const normalizedRows = normalizeRows(payload);

      setRows(normalizedRows);
      setFilteredRows(normalizedRows);
      setSelectedResult(null);
      setSelectedRowIndex(null);
    } catch (err) {
      console.error("Error fetching typing test data:", err);
      setRows([]);
      setFilteredRows([]);
      setSelectedResult(null);
      setSelectedRowIndex(null);
      setFetchError(err?.message || "Unable to fetch typing test data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    const { startDate, endDate } = dateRange[0];

    const safeRows = Array.isArray(rows) ? rows : [];

    const filtered = safeRows.filter((r) => {
      const matchesQuery = Object.values(r || {}).some((val) =>
        val?.toString().toLowerCase().includes(q),
      );

      const createdDate = r?.CREATED_AT ? new Date(r.CREATED_AT) : null;
      const hasValidDate =
        createdDate && !Number.isNaN(createdDate.getTime());

      const inRange =
        !r?.CREATED_AT ||
        !hasValidDate ||
        ((!startDate || createdDate >= startDate) &&
          (!endDate || createdDate <= endDate));

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
    const exportRows = Array.isArray(filteredRows) ? filteredRows : [];

    if (!exportRows.length) {
      alert("No data to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "TypingResults");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    const fileName = `TypingTestResults_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    saveAs(blob, fileName);
  };

  const safeFilteredRows = Array.isArray(filteredRows) ? filteredRows : [];

  const totalEntries = safeFilteredRows.length;

  const averageAccuracy = totalEntries
    ? (
        safeFilteredRows.reduce(
          (sum, row) => sum + parseFloat(row.ACCURACY || 0),
          0,
        ) / totalEntries
      ).toFixed(2)
    : "—";

  const averageNetSpeed = totalEntries
    ? (
        safeFilteredRows.reduce(
          (sum, row) => sum + parseFloat(row.NET_SPEED || 0),
          0,
        ) / totalEntries
      ).toFixed(2)
    : "—";

  const topNetSpeedRow = safeFilteredRows.reduce((max, row) => {
    const speed = parseFloat(row.NET_SPEED || 0);
    return speed > parseFloat(max.NET_SPEED || 0) ? row : max;
  }, {});

  const topNetSpeed = topNetSpeedRow.NET_SPEED
    ? `${topNetSpeedRow.NET_SPEED} WPM (${
        topNetSpeedRow.CANDIDATENAME || "—"
      })`
    : "—";

  const topAccuracyRow = safeFilteredRows.reduce((max, row) => {
    const accuracy = parseFloat(row.ACCURACY || 0);
    return accuracy > parseFloat(max.ACCURACY || 0) ? row : max;
  }, {});

  const topAccuracy = topAccuracyRow.ACCURACY
    ? `${parseFloat(topAccuracyRow.ACCURACY).toFixed(2)}% (${
        topAccuracyRow.CANDIDATENAME || "—"
      })`
    : "—";

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900">
      <SidebarIcons />

      <div className="flex flex-1 flex-col">
        <Header pageTitle="Typing Test" />
        
        <div className="flex flex-1 flex-row overflow-hidden">
          <div className="flex flex-1 flex-col px-6 pb-6">
            <div className="flex flex-wrap gap-4 pt-6">
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
            </div>

            <div className="mb-2 flex items-center gap-2 pt-4">
              <div className="relative w-[300px]">
                <input
                  type="text"
                  placeholder="Search candidate, ID, etc."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                />

                <img
                  src={searchIcon}
                  alt="Search"
                  className="absolute left-3 top-1/2 w-4 -translate-y-1/2 opacity-60"
                />
              </div>

              <div className="relative inline-block">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCalendar((prev) => !prev)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {formatRangeLabel()}
                  </button>

                  {dateRange[0].startDate && dateRange[0].endDate && (
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
                      Clear
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExport}
                    className="rounded-lg border border-green-200 bg-green-100 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-200"
                  >
                    Export
                  </button>
                </div>

                {showCalendar && (
                  <div className="absolute left-full top-full z-50 ml-2">
                    <div className="inline-block rounded-xl border border-slate-200 bg-white shadow-md">
                      <DateRange
                        editableDateInputs
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

            {fetchError && (
              <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {fetchError}
              </div>
            )}

            <div className="mt-2 max-h-[calc(100vh-200px)] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-[11px] uppercase text-slate-600 shadow-sm">
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
                  {loading ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="py-6 text-center text-slate-400"
                      >
                        Loading typing test data...
                      </td>
                    </tr>
                  ) : safeFilteredRows.length > 0 ? (
                    safeFilteredRows.map((row, idx) => (
                      <tr
                        key={row.id || row.APPLICANTID || idx}
                        className={`cursor-pointer transition-colors ${
                          selectedRowIndex === idx
                            ? "bg-blue-50"
                            : "hover:bg-slate-50"
                        }`}
                        onClick={() => {
                          setSelectedRowIndex(idx);
                          setSelectedResult(row);
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
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="py-6 text-center text-slate-400"
                      >
                        No results found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="w-[350px] overflow-auto border-l border-slate-200 bg-white p-6 shadow-xl">
            {selectedResult ? (
              <>
                <h2 className="mb-1 text-lg font-semibold">
                  {selectedResult.CANDIDATENAME?.toUpperCase() || "—"}
                </h2>

                <p className="mb-4 text-xs uppercase text-slate-500">
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
                    value={
                      selectedResult.NET_SPEED
                        ? `${selectedResult.NET_SPEED} WPM`
                        : "—"
                    }
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
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Select a row to preview result
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const PreviewItem = ({ label, value }) => (
  <div>
    <p className="mb-1 text-[11px] font-semibold uppercase text-slate-500">
      {label}
    </p>

    <p className="text-sm text-slate-800">{value || "—"}</p>
  </div>
);

const AnalyticsCard = ({ label, value }) => (
  <div className="min-w-[180px] rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
    <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
      {label}
    </p>

    <p className="text-lg font-bold text-slate-800">{value}</p>
  </div>
);