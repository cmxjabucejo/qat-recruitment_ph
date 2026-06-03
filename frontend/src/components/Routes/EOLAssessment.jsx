import React, { useState, useEffect, useRef } from "react";
import { DateRange } from "react-date-range";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

import Sidebar from "../common/Sidebar";
import { SERVER_URL } from "../lib/constants";
import searchIcon from "../../assets/search_symbol.png";
import Header from "../../components/common/Header";
import { apiFetch } from "../lib/apiFetch";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

ChartJS.register(ArcElement, Tooltip, Legend);

const normalizeRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.[0])) return payload[0];
  return [];
};

const safeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const percentText = (value) => {
  if (value === null || value === undefined || value === "") return "—";

  const num = Number(value);

  if (!Number.isFinite(num)) return "—";

  return `${(num * 100).toFixed(2)}%`;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return format(date, "MMM dd, yyyy");
};

export default function EOLAssessment() {
  const tableRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [dateRange, setDateRange] = useState([
    { startDate: null, endDate: null, key: "selection" },
  ]);

  const [showCalendar, setShowCalendar] = useState(false);

  const formatRangeLabel = () => {
    const { startDate, endDate } = dateRange[0];

    if (!startDate || !endDate) return "Select Date Range";

    return `${format(startDate, "MMM dd, yyyy")} - ${format(
      endDate,
      "MMM dd, yyyy",
    )}`;
  };

  const fetchData = async () => {
    setIsLoading(true);
    setFetchError("");

    try {
      const res = await apiFetch(`${SERVER_URL}/assessments/eol-assessment`);

      if (!res || !res.ok) {
        throw new Error(`Server responded with ${res?.status || "error"}`);
      }

      const payload = await res.json();
      const normalizedRows = normalizeRows(payload);

      setRows(normalizedRows);
      setFilteredRows(normalizedRows);
      setSelectedRow(null);
      setSelectedRowIndex(null);
    } catch (err) {
      console.error("❌ Failed to fetch EOL assessment data:", err);

      setRows([]);
      setFilteredRows([]);
      setSelectedRow(null);
      setSelectedRowIndex(null);

      setFetchError(err?.message || "Unable to fetch EOL assessment data.");
    } finally {
      setIsLoading(false);
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
      const matchesSearch = Object.values(r || {}).some((val) =>
        val?.toString().toLowerCase().includes(q),
      );

      const d = new Date(r?.assessment_date);
      const hasValidDate = !Number.isNaN(d.getTime());

      const inRange =
        !r?.assessment_date ||
        !hasValidDate ||
        ((!startDate || d >= startDate) && (!endDate || d <= endDate));

      return matchesSearch && inRange;
    });

    setFilteredRows(filtered);
  }, [searchQuery, rows, dateRange]);

  const safeFilteredRows = Array.isArray(filteredRows) ? filteredRows : [];
  const totalEntries = safeFilteredRows.length;

  const averageEnglishScore = totalEntries
    ? (
        (safeFilteredRows.reduce(
          (sum, r) => sum + safeNumber(r.overall_score),
          0,
        ) /
          totalEntries) *
        100
      ).toFixed(2)
    : "0.00";

  const averageEmailScore = totalEntries
    ? (
        (safeFilteredRows.reduce(
          (sum, r) => sum + safeNumber(r.overall_email_score),
          0,
        ) /
          totalEntries) *
        100
      ).toFixed(2)
    : "0.00";

  const passedEnglish = safeFilteredRows.filter(
    (r) => r.remarks?.toLowerCase() === "passed",
  ).length;

  const failedEnglish = totalEntries - passedEnglish;

  const passedEmail = safeFilteredRows.filter((r) => {
    const remarks = r.email_remarks?.toLowerCase();
    return remarks === "passed" || remarks === "pass";
  }).length;

  const failedEmail = totalEntries - passedEmail;

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

  const averageOverallScore = totalEntries
    ? (
        (safeFilteredRows.reduce((sum, r) => {
          const eng = safeNumber(r.overall_score);
          const email = safeNumber(r.overall_email_score);
          return sum + (eng + email) / 2;
        }, 0) /
          totalEntries) *
        100
      ).toFixed(2)
    : "0.00";

  const passedOverall = safeFilteredRows.filter((r) => {
    const eng = safeNumber(r.overall_score);
    const email = safeNumber(r.overall_email_score);
    return (eng + email) / 2 >= 0.75;
  }).length;

  const failedOverall = totalEntries - passedOverall;

  const percentagePassedOverall = totalEntries
    ? ((passedOverall / totalEntries) * 100).toFixed(2)
    : "0.00";

  const handleExport = async () => {
    const exportRows = Array.isArray(filteredRows) ? filteredRows : [];

    if (!exportRows.length) {
      alert("No data to export.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("EOLAssessment");

    const headers = Object.keys(exportRows[0]);

    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.max(header.length + 5, 20),
    }));

    exportRows.forEach((row) => {
      worksheet.addRow(row);
    });

    worksheet.getRow(1).font = {
      bold: true,
    };

    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    worksheet.columns.forEach((column) => {
      let maxLength = column.header.length;

      column.eachCell({ includeEmpty: true }, (cell) => {
        const value = cell.value ? cell.value.toString() : "";
        maxLength = Math.max(maxLength, value.length);
      });

      column.width = Math.min(maxLength + 3, 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "EOL_Assessment.xlsx");
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Header pageTitle="EOL Assessment" />

        <div className="flex min-h-0 flex-1 overflow-hidden text-[13px]">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-3 pb-3">
            <div
              className="flex gap-4 overflow-x-auto pb-2 pt-4"
              style={{ scrollSnapType: "x mandatory" }}
            >
              <div className="flex items-start gap-2">
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

              <div className="flex items-start gap-4">
                <div className="min-w-[280px] rounded-lg bg-white px-3 py-2 shadow-sm">
                  <h3 className="mb-2 text-[11px] font-semibold">
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

                <AnalyticsCard
                  label="Avg English"
                  value={`${averageEnglishScore}%`}
                />
                <AnalyticsCard
                  label="Avg Email"
                  value={`${averageEmailScore}%`}
                />
                <AnalyticsCard
                  label="Avg Overall"
                  value={`${averageOverallScore}%`}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className="relative w-[330px]">
                <input
                  className="w-full rounded border py-2 pl-10"
                  placeholder="Search candidate, position, score..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                <img
                  src={searchIcon}
                  className="absolute left-3 top-1/2 w-4 -translate-y-1/2 opacity-60"
                  alt="search"
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
                    className="rounded-lg border border-green-200 bg-green-100 px-4 py-2 text-sm text-green-800 hover:bg-green-200"
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
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {fetchError}
              </div>
            )}

            <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="h-full overflow-auto">
                <table
                  ref={tableRef}
                  className="min-w-[1180px] w-full table-fixed text-[13px]"
                >
                  <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] uppercase tracking-wide text-slate-600">
                    <tr>
                      <th
                        style={{ width: "8%" }}
                        className="px-3 py-2 text-left"
                      >
                        Date
                      </th>
                      <th
                        style={{ width: "13%" }}
                        className="px-3 py-2 text-left"
                      >
                        Candidate
                      </th>
                      <th
                        style={{ width: "14%" }}
                        className="px-3 py-2 text-left"
                      >
                        Position
                      </th>
                      <th
                        style={{ width: "6%" }}
                        className="px-3 py-2 text-left"
                      >
                        Attempt
                      </th>
                      <th
                        style={{ width: "7%" }}
                        className="px-3 py-2 text-left"
                      >
                        Grammar
                      </th>
                      <th
                        style={{ width: "7%" }}
                        className="px-3 py-2 text-left"
                      >
                        Reading
                      </th>
                      <th
                        style={{ width: "7%" }}
                        className="px-3 py-2 text-left"
                      >
                        Sentence
                      </th>
                      <th
                        style={{ width: "8%" }}
                        className="px-3 py-2 text-left"
                      >
                        English
                      </th>
                      <th
                        style={{ width: "8%" }}
                        className="px-3 py-2 text-left"
                      >
                        Remarks
                      </th>
                      <th
                        style={{ width: "8%" }}
                        className="px-3 py-2 text-left"
                      >
                        Email
                      </th>
                      <th
                        style={{ width: "8%" }}
                        className="px-3 py-2 text-left"
                      >
                        Email Remarks
                      </th>
                      <th
                        style={{ width: "7%" }}
                        className="px-3 py-2 text-left"
                      >
                        Overall
                      </th>
                      <th
                        style={{ width: "7%" }}
                        className="px-3 py-2 text-left"
                      >
                        Result
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan="13"
                          className="py-6 text-center text-slate-400"
                        >
                          Loading assessment data...
                        </td>
                      </tr>
                    ) : safeFilteredRows.length > 0 ? (
                      safeFilteredRows.map((row, i) => {
                        const englishScore = safeNumber(row.overall_score);
                        const emailScore = safeNumber(row.overall_email_score);

                        const hasOverall =
                          row.overall_score !== null &&
                          row.overall_score !== undefined &&
                          row.overall_email_score !== null &&
                          row.overall_email_score !== undefined;

                        const overallRate = hasOverall
                          ? ((englishScore + emailScore) / 2) * 100
                          : null;

                        const overallPassed =
                          hasOverall && (englishScore + emailScore) / 2 >= 0.75;

                        return (
                          <tr
                            key={row.id || row.applicantid || i}
                            className={`cursor-pointer border-b border-slate-100 transition-colors ${
                              selectedRowIndex === i
                                ? "bg-blue-50"
                                : "hover:bg-slate-50"
                            }`}
                            onClick={() => {
                              setSelectedRow(row);
                              setSelectedRowIndex(i);
                            }}
                          >
                            <td className="px-3 py-2 align-top">
                              <div className="whitespace-nowrap">
                                {formatDate(row.assessment_date)}
                              </div>
                            </td>

                            <td className="px-3 py-2 align-top font-semibold">
                              <div className="line-clamp-2">
                                {(row.candidatename || "—").toUpperCase()}
                              </div>
                            </td>

                            <td className="px-3 py-2 align-top">
                              <div className="line-clamp-2">
                                {row.applied_position_title || "—"}
                              </div>
                            </td>

                            <td className="px-3 py-2 align-top">
                              <div className="whitespace-nowrap">
                                {row.attempt_no || "—"}
                              </div>
                            </td>

                            <td className="px-3 py-2 align-top">
                              <div className="whitespace-nowrap">
                                {percentText(row.grammar_score)}
                              </div>
                            </td>

                            <td className="px-3 py-2 align-top">
                              <div className="whitespace-nowrap">
                                {percentText(row.reading_score)}
                              </div>
                            </td>

                            <td className="px-3 py-2 align-top">
                              <div className="whitespace-nowrap">
                                {percentText(row.sentence_score)}
                              </div>
                            </td>

                            <td className="px-3 py-2 align-top">
                              <div className="whitespace-nowrap">
                                {percentText(row.overall_score)}
                              </div>
                            </td>

                            <td className="px-3 py-2 align-top">
                              <div className="line-clamp-2">
                                {row.remarks || "—"}
                              </div>
                            </td>

                            <td className="px-3 py-2 align-top">
                              <div className="whitespace-nowrap">
                                {percentText(row.overall_email_score)}
                              </div>
                            </td>

                            <td className="px-3 py-2 align-top">
                              <div className="line-clamp-2">
                                {row.email_remarks || "—"}
                              </div>
                            </td>

                            <td className="px-3 py-2 align-top font-bold">
                              <div className="whitespace-nowrap">
                                {overallRate !== null
                                  ? `${overallRate.toFixed(2)}%`
                                  : "—"}
                              </div>
                            </td>

                            <td className="px-3 py-2 align-top font-bold">
                              <div
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                                  hasOverall
                                    ? overallPassed
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {hasOverall
                                  ? overallPassed
                                    ? "Passed"
                                    : "Failed"
                                  : "—"}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan="13"
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

            <div className="hidden w-[300px] shrink-0 overflow-auto border-l bg-white p-5 shadow-xl 2xl:block">
              {selectedRow ? (
                <>
                  <h2 className="mb-1 line-clamp-2 text-lg font-semibold">
                    {selectedRow.candidatename?.toUpperCase() || "—"}
                  </h2>

                  <p className="mb-4 truncate text-xs uppercase text-slate-500">
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
                      value={percentText(selectedRow.grammar_score)}
                    />
                    <PreviewItem
                      label="Reading Score"
                      value={percentText(selectedRow.reading_score)}
                    />
                    <PreviewItem
                      label="Sentence Score"
                      value={percentText(selectedRow.sentence_score)}
                    />
                    <PreviewItem
                      label="English Score"
                      value={percentText(selectedRow.overall_score)}
                    />
                    <PreviewItem label="Remarks" value={selectedRow.remarks} />
                    <PreviewItem
                      label="Email Etiquette"
                      value={percentText(selectedRow.overall_email_score)}
                    />
                    <PreviewItem
                      label="Email Remarks"
                      value={selectedRow.email_remarks}
                    />
                    <PreviewItem
                      label="Date"
                      value={formatDate(selectedRow.assessment_date)}
                    />
                    <PreviewItem
                      label="Overall Rate"
                      value={
                        selectedRow.overall_score !== null &&
                        selectedRow.overall_score !== undefined &&
                        selectedRow.overall_email_score !== null &&
                        selectedRow.overall_email_score !== undefined
                          ? `${(
                              ((safeNumber(selectedRow.overall_score) +
                                safeNumber(selectedRow.overall_email_score)) /
                                2) *
                              100
                            ).toFixed(2)}%`
                          : "—"
                      }
                    />
                    <PreviewItem
                      label="Overall Remarks"
                      value={
                        selectedRow.overall_score !== null &&
                        selectedRow.overall_score !== undefined &&
                        selectedRow.overall_email_score !== null &&
                        selectedRow.overall_email_score !== undefined
                          ? (safeNumber(selectedRow.overall_score) +
                              safeNumber(selectedRow.overall_email_score)) /
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
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Select a row to preview result
                </div>
              )}
            </div>
          </div>

          <div className="w-[350px] overflow-auto border-l bg-white p-6 shadow-xl">
            {selectedRow ? (
              <>
                <h2 className="mb-1 text-lg font-semibold">
                  {selectedRow.candidatename?.toUpperCase() || "—"}
                </h2>

                <p className="mb-4 text-xs uppercase text-slate-500">
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
                    value={percentText(selectedRow.grammar_score)}
                  />
                  <PreviewItem
                    label="Reading Score"
                    value={percentText(selectedRow.reading_score)}
                  />
                  <PreviewItem
                    label="Sentence Score"
                    value={percentText(selectedRow.sentence_score)}
                  />
                  <PreviewItem
                    label="English Score"
                    value={percentText(selectedRow.overall_score)}
                  />
                  <PreviewItem label="Remarks" value={selectedRow.remarks} />
                  <PreviewItem
                    label="Email Etiquette"
                    value={percentText(selectedRow.overall_email_score)}
                  />
                  <PreviewItem
                    label="Email Remarks"
                    value={selectedRow.email_remarks}
                  />
                  <PreviewItem
                    label="Date"
                    value={formatDate(selectedRow.assessment_date)}
                  />
                  <PreviewItem
                    label="Overall Rate"
                    value={
                      selectedRow.overall_score !== null &&
                      selectedRow.overall_score !== undefined &&
                      selectedRow.overall_email_score !== null &&
                      selectedRow.overall_email_score !== undefined
                        ? `${(
                            ((safeNumber(selectedRow.overall_score) +
                              safeNumber(selectedRow.overall_email_score)) /
                              2) *
                            100
                          ).toFixed(2)}%`
                        : "—"
                    }
                  />
                  <PreviewItem
                    label="Overall Remarks"
                    value={
                      selectedRow.overall_score !== null &&
                      selectedRow.overall_score !== undefined &&
                      selectedRow.overall_email_score !== null &&
                      selectedRow.overall_email_score !== undefined
                        ? (safeNumber(selectedRow.overall_score) +
                            safeNumber(selectedRow.overall_email_score)) /
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

const AnalyticsCard = ({ label, value }) => (
  <div className="flex h-[165px] min-w-[120px] flex-col justify-center rounded-lg border bg-white px-3 py-2 shadow-sm">
    <span className="text-center text-[9px] font-medium uppercase leading-none text-slate-500">
      {label}
    </span>
    <span className="mt-1 text-center text-[13px] font-semibold leading-none text-slate-800">
      {value}
    </span>
  </div>
);

const PreviewItem = ({ label, value }) => (
  <div>
    <p className="mb-1 text-[11px] font-semibold uppercase text-slate-500">
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
        backgroundColor: ["#3B82F6", "#E5E7EB"],
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
    <div className="relative mx-auto h-32 w-32">
      <Doughnut data={data} options={options} />

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-blue-600">
          {safeNumber(value).toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

const StackedBarChart = ({ data }) => (
  <div className="w-full space-y-4">
    {(Array.isArray(data) ? data : []).map((item, idx) => {
      const total = item.passed + item.failed || 1;
      const passPercent = Math.round((item.passed / total) * 100);
      const failPercent = 100 - passPercent;

      return (
        <div key={idx}>
          <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
            <span>{item.category}</span>
            <span>{passPercent}% Passed</span>
          </div>

          <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-200">
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
