import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { DateRange } from "react-date-range";
import SidebarIcons from "../../components/common/Sidebar";
import Header from "../../components/common/Header";
import searchIcon from "../../assets/search_symbol.png";
import { SERVER_URL } from "../lib/constants";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { HiDownload, HiCalculator } from "react-icons/hi";
import NewCandidateModal from "../../components/modals/NewCandidateModal";
import EditCandidateInfoModal from "../../components/modals/EditCandidateInfoModal";
import UpdateCandidateLifecycleModal from "../../components/modals/UpdateCandidateLifecycleModal";
import { HiCheckCircle, HiXCircle } from "react-icons/hi";
import { apiFetch } from "../lib/apiFetch";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { api } from "../lib/axiosInterceptor";

// Helper
const formatDate = (iso) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "—" : format(date, "MMM dd, yyyy");
};

const normalizeRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.rows)) return payload.rows;

  // old mysql2 shape sometimes returns [rows, fields]
  if (Array.isArray(payload?.[0])) return payload[0];

  return [];
};

const normalizeObjectPayload = (payload) => {
  if (!payload) return {};
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return payload;
};

function RecruitmentTracker() {
  const [trackers, setTrackers] = useState([]);
  const [filteredTrackers, setFilteredTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");
  const [positionFilter, setPositionFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [setupFilter, setSetupFilter] = useState("All");
  const [recruiterFilter, setRecruiterFilter] = useState("All");

  const [dateRange, setDateRange] = useState([
    { startDate: null, endDate: null, key: "selection" },
  ]);

  const [showCalendar, setShowCalendar] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedTab, setSelectedTab] = useState("Profile");

  const [isUpdateCycleModalOpen, setIsUpdateCycleModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [toast, setToast] = useState({ show: false, type: "", message: "" });

  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const [isSendingTyping, setIsSendingTyping] = useState(false);
  const [isSendingEOL, setIsSendingEOL] = useState(false);

  const [isGMModalOpen, setIsGMModalOpen] = useState(false);
  const [askingSalary, setAskingSalary] = useState("");
  const [nightDiff, setNightDiff] = useState(false);
  const [billRate, setBillRate] = useState("");
  const [billableHours, setBillableHours] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [margin, setMargin] = useState("");
  const [borderColor, setBorderColor] = useState("#000");

  const [recruiters, setRecruiters] = useState([]);

  const [accountOptions, setAccountOptions] = useState([]);
  const [lobOptions, setLobOptions] = useState([]);
  const [taskOptions, setTaskOptions] = useState([]);

  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: "",
    message: "",
  });

  const [viewedApplicants, setViewedApplicants] = useState(() => {
    const saved = localStorage.getItem("viewedApplicants");
    return saved ? JSON.parse(saved) : [];
  });

  const INITIAL_FORM_DATA = {
    candidatesource: "",
    referral_code: "",
    candidatetype: "",
    applied_role: "",
    applied_position_title: "",
    department: "",
    nameTitle: "",
    nameSuffix: "",
    lastName: "",
    firstName: "",
    middleName: "",
    gender: "",
    candidatephone1: "",
    candidatephone2: "",
    candidateemail1: "",
    candidateemail2: "",
    resume: null,
    overallStatus: "Active Application",
  };

  const normalizeRow = (row) =>
    Object.fromEntries(
      Object.entries(row || {}).map(([k, v]) => [
        k,
        v === null || v === "null" ? "" : v,
      ]),
    );

  const normalizeFormData = (data) => {
    const mapping = {
      initialinterviewstatus: "initialInterviewStatus",
      initialinterviewdatetime: "initialInterviewDate",

      skillsassessmentstatus: "skillsAssessmentStatus",
      skillsassessmentdatetime: "skillsAssessmentDate",

      clientinterviewstatus: "clientInterviewStatus",
      clientinterviewdatetime: "clientInterviewDate",

      finalinterviewstatus: "finalInterviewStatus",
      finalinterviewdatetime: "finalInterviewDate",
      finaliinterviewdatetime: "finalInterviewDate",

      jobofferstatus: "jobOfferStatus",
      jobofferdatetime: "jobOfferDate",

      onboardingstatus: "onboardingStatus",
      onboardingdatetime: "onboardingDate",

      endorsementstatus: "endorsementStatus",
      endorsementdatetime: "endorsementDateTime",

      falloutdatetime: "falloutDateTime",
      fallout: "fallout",

      overall_status: "overallStatus",
      profiled_account: "profiledForAccount",
      profiled_lob: "lob",
      profiled_task: "task",
      profiled_role: "roleProfiled",
      worksetup: "workSetup",
      remarks: "remarks",
      recruiter: "recruiter",

      applicationid: "applicationid",
      candidatename: "candidatename",
      gender: "gender",
      applied_role: "applied_role",
      applied_position_title: "applied_position_title",

      candidatecvattachment: "candidatecvattachment",
      resume: "resume",
    };

    const normalized = {};

    Object.keys(data || {}).forEach((key) => {
      const mappedKey = mapping[key] || key;
      let value = data[key];

      if (typeof value === "string" && value.trim() === "1900-01-01") {
        value = "";
      }

      if (value === null || value === undefined || value === "null") {
        value = "";
      }

      normalized[mappedKey] = value;
    });

    return normalized;
  };

  const camelize = (str) => str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

  const displayValue = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      value === "null"
    ) {
      return "—";
    }

    return value;
  };

  const getFieldLabel = (field) => {
    const labels = {
      applicationid: "Application ID",
      candidatename: "Name",
      gender: "Gender",
      applied_role: "Role Applied",
      applied_position_title: "Position Title",
      candidatesource: "Application Source",
      referral_code: "Referral Code",
      department: "Department",
      profiled_role: "Role Profiled",
      profiled_account: "Profiled for Account",
      profiled_lob: "Line of Business",
      profiled_task: "Task",
      worksetup: "Work Setup",
      recruiter: "Recruiter",
      candidatephone1: "Phone 1",
      candidatephone2: "Phone 2",
      candidateemail1: "Email 1",
      candidateemail2: "Email 2",
      candidatecvattachment: "Resume",
    };

    return labels[field] || field.replace(/_/g, " ");
  };

  const renderFieldValue = (field, value) => {
    if (!value) return "—";

    if (field.includes("date") || camelize(field).includes("Date")) {
      return formatDate(value);
    }

    if (field === "candidatecvattachment") {
      return value;
    }

    return value;
  };

  const extractFileName = (url) => {
    if (!url) return "";
    return String(url).split("/").pop();
  };

  const categories = {
    Profile: [
      "applicationid",
      "candidatename",
      "gender",
      "applied_role",
      "applied_position_title",
      "candidatesource",
      "referral_code",
      "department",
      "profiled_role",
      "profiled_account",
      "profiled_lob",
      "profiled_task",
      "worksetup",
      "recruiter",
      "candidatephone1",
      "candidatephone2",
      "candidateemail1",
      "candidateemail2",
      "candidatecvattachment",
    ],
    "Process Tracking": [
      "initialinterviewdatetime",
      "initialinterviewstatus",
      "skillsassessmentdatetime",
      "skillsassessmentstatus",
      "clientinterviewdatetime",
      "clientinterviewstatus",
      "finalinterviewdatetime",
      "finalinterviewstatus",
      "jobofferdatetime",
      "jobofferstatus",
      "onboardingdatetime",
      "onboardingstatus",
      "endorsementdatetime",
      "endorsementstatus",
      "fallout",
      "falloutdatetime",
      "overall_status",
    ],
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const response = await apiFetch(
        `${SERVER_URL}/applicants/recruitment-tracker`,
      );

      if (!response || !response.ok) {
        throw new Error(`Server responded with ${response?.status || "error"}`);
      }

      const payload = await response.json();
      const rows = normalizeRows(payload);
      const normalized = rows.map(normalizeRow);

      setTrackers(normalized);
      setFilteredTrackers(normalized);
      setError(null);

      console.log(`📊 Recruitment Tracker fetched ${normalized.length} rows`);
    } catch (error) {
      console.error("❌ Error fetching tracker data:", error);
      setError(error.message || "Unknown error occurred");
      setTrackers([]);
      setFilteredTrackers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountList = async () => {
    try {
      const response = await apiFetch(`${SERVER_URL}/accounts/accountlist`);

      if (!response || !response.ok) {
        throw new Error("Failed to fetch account list");
      }

      const payload = await response.json();
      const data = normalizeRows(payload);

      const uniqueAccountsMap = new Map();

      data.forEach((item) => {
        if (!item?.ACCOUNT) return;

        const accountKey = String(item.ACCOUNT).toLowerCase();

        if (!uniqueAccountsMap.has(accountKey)) {
          uniqueAccountsMap.set(accountKey, {
            ACCOUNT: item.ACCOUNT,
          });
        }
      });

      const uniqueAccounts = Array.from(uniqueAccountsMap.values()).sort(
        (a, b) =>
          String(a.ACCOUNT || "")
            .toLowerCase()
            .localeCompare(String(b.ACCOUNT || "").toLowerCase()),
      );

      setAccountOptions(uniqueAccounts);
    } catch (error) {
      console.error("Error fetching account data:", error);
      setAccountOptions([]);
    }
  };

  const fetchLobList = async (account) => {
    try {
      const response = await apiFetch(
        `${SERVER_URL}/accounts/loblist?account=${encodeURIComponent(account)}`,
      );

      if (!response || !response.ok) {
        throw new Error("Failed to fetch LOB list");
      }

      const payload = await response.json();
      const data = normalizeRows(payload);

      const uniqueLobs = [
        ...new Set(data.map((item) => item?.LOB).filter(Boolean)),
      ].sort((a, b) =>
        String(a || "")
          .toLowerCase()
          .localeCompare(String(b || "").toLowerCase()),
      );

      setLobOptions(uniqueLobs);
    } catch (error) {
      console.error("Error fetching LOB data:", error);
      setLobOptions([]);
    }
  };

  const fetchTaskList = async (account, lob) => {
    try {
      const response = await apiFetch(
        `${SERVER_URL}/accounts/tasklist?account=${encodeURIComponent(
          account,
        )}&lob=${encodeURIComponent(lob)}`,
      );

      if (!response || !response.ok) {
        throw new Error("Failed to fetch Task list");
      }

      const payload = await response.json();
      const data = normalizeRows(payload);

      const uniqueTasks = [
        ...new Set(data.map((item) => item?.TASK).filter(Boolean)),
      ].sort((a, b) =>
        String(a || "")
          .toLowerCase()
          .localeCompare(String(b || "").toLowerCase()),
      );

      setTaskOptions(uniqueTasks);
    } catch (error) {
      console.error("Error fetching Task data:", error);
      setTaskOptions([]);
    }
  };

  const fetchAccountCode = async (account, lob, task) => {
    try {
      if (formData.department !== "Operations") return null;

      const response = await apiFetch(
        `${SERVER_URL}/accounts/accountcode?account=${encodeURIComponent(
          account,
        )}&lob=${encodeURIComponent(lob)}&task=${encodeURIComponent(task)}`,
      );

      if (!response || !response.ok) {
        throw new Error("Failed to fetch ACCOUNTCODE");
      }

      const payload = await response.json();
      const data = normalizeObjectPayload(payload);

      return data?.ACCOUNTCODE || null;
    } catch (error) {
      console.error("Error fetching ACCOUNTCODE data:", error);
      return null;
    }
  };

  const fetchRecruiters = async () => {
    try {
      const response = await apiFetch(
        `${SERVER_URL}/applicants/recruiters-list`,
      );

      if (!response || !response.ok) {
        throw new Error("Failed to fetch recruiters.");
      }

      const payload = await response.json();
      const rows = normalizeRows(payload);

      const uniqueRecruiters = Array.from(
        new Set(
          rows
            .map(
              (recruiter) =>
                recruiter?.NAME ||
                recruiter?.name ||
                recruiter?.recruiter ||
                recruiter?.RECRUITER,
            )
            .filter(Boolean),
        ),
      ).map((name) => {
        return (
          rows.find(
            (recruiter) =>
              recruiter?.NAME === name ||
              recruiter?.name === name ||
              recruiter?.recruiter === name ||
              recruiter?.RECRUITER === name,
          ) || { NAME: name }
        );
      });

      setRecruiters(uniqueRecruiters);
    } catch (error) {
      console.error("Error fetching recruiters:", error);
      setRecruiters([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchRecruiters();
    fetchAccountList();
  }, []);

  useEffect(() => {
    if (isNewModalOpen) {
      fetchAccountList();
    }
  }, [isNewModalOpen]);

  useEffect(() => {
    if (isUpdateCycleModalOpen) {
      fetchAccountList();
    }
  }, [isUpdateCycleModalOpen]);

  useEffect(() => {
    const q = search.toLowerCase();
    const { startDate, endDate } = dateRange[0];

    const filtered = trackers.filter((item) => {
      const matchSearch = Object.values(item).some((v) =>
        v?.toString().toLowerCase().includes(q),
      );

      const matchStatus =
        statusFilter === "All" || item.overall_status === statusFilter;

      const matchPosition =
        positionFilter === "All" ||
        item.applied_position_title === positionFilter;

      const matchSource =
        sourceFilter === "All" || item.candidatesource === sourceFilter;

      const matchSetup =
        setupFilter === "All" || item.worksetup === setupFilter;

      const matchRecruiter =
        recruiterFilter === "All" || item.recruiter === recruiterFilter;

      const d = new Date(item.applicationdatetime);
      const inRange =
        (!startDate || d >= startDate) && (!endDate || d <= endDate);

      return (
        matchSearch &&
        matchStatus &&
        matchPosition &&
        matchSource &&
        matchSetup &&
        matchRecruiter &&
        inRange
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      const da = new Date(a.applicationdatetime);
      const db = new Date(b.applicationdatetime);
      return sortOrder === "newest" ? db - da : da - db;
    });

    setFilteredTrackers(sorted);
  }, [
    trackers,
    search,
    statusFilter,
    positionFilter,
    sourceFilter,
    setupFilter,
    recruiterFilter,
    dateRange,
    sortOrder,
  ]);

  useEffect(() => {
    if (statusModal.isOpen) {
      const timer = setTimeout(() => {
        setStatusModal({ isOpen: false, type: "", message: "" });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [statusModal.isOpen]);

  useEffect(() => {
    if (!formData.voiceUrl && formData.applicationId) {
      const fetchVoiceUrl = async () => {
        try {
          const res = await apiFetch(
            `${SERVER_URL}/mediafiles/voice-recording/${formData.applicationId}`,
          );

          const data = await res.json();

          if (res.ok && data.voiceUrl) {
            setFormData((prev) => ({
              ...prev,
              voiceUrl: data.voiceUrl,
            }));
          }
        } catch (err) {
          console.error("❌ Failed to fetch voice URL:", err);
        }
      };

      fetchVoiceUrl();
    }
  }, [formData.applicationId, formData.voiceUrl]);

  useEffect(() => {
    const src = formData.applicationSource || "";
    const hasRef = !!(formData.referralCode && formData.referralCode.trim());

    if (src === "QuickApp" && hasRef) {
      setFormData((prev) =>
        prev.applicationSource === "QuickApp - Referral"
          ? prev
          : { ...prev, applicationSource: "QuickApp - Referral" },
      );
    } else if (src === "QuickApp - Referral" && !hasRef) {
      setFormData((prev) =>
        prev.applicationSource === "QuickApp"
          ? prev
          : { ...prev, applicationSource: "QuickApp" },
      );
    }
  }, [formData.applicationSource, formData.referralCode]);

  useEffect(() => {
    if (
      formData.endorsementStatus === "Endorsed" &&
      formData.overallStatus !== "Successful Hire"
    ) {
      setFormData((prevData) => ({
        ...prevData,
        overallStatus: "Successful Hire",
      }));
    }
  }, [formData.endorsementStatus, formData.overallStatus]);

  useEffect(() => {
    console.log("Viewed applicants:", viewedApplicants);
  }, [viewedApplicants]);

  useEffect(() => {
    calculateMargin();
  }, [askingSalary, nightDiff, billRate, billableHours, conversionRate]);

  const uniquePositions = [
    ...new Set(trackers.map((t) => t.applied_position_title)),
  ].filter(Boolean);

  const uniqueStatuses = [
    ...new Set(trackers.map((t) => t.overall_status)),
  ].filter(Boolean);

  const uniqueSources = [
    ...new Set(trackers.map((t) => t.candidatesource)),
  ].filter(Boolean);

  const uniqueSetups = [...new Set(trackers.map((t) => t.worksetup))].filter(
    Boolean,
  );

  const uniqueRecruiters = [
    ...new Set(trackers.map((t) => t.recruiter)),
  ].filter(Boolean);

  const formatRangeLabel = () => {
    const { startDate, endDate } = dateRange[0];

    if (!startDate || !endDate) return "Select Date Range";

    return `${format(startDate, "MMM dd, yyyy")} - ${format(
      endDate,
      "MMM dd, yyyy",
    )}`;
  };

  const handleAccountChange = (e) => {
    const selectedAccount = e.target.value;

    setFormData((prev) => ({
      ...prev,
      profiledForAccount: selectedAccount,
      lob: "",
      task: "",
    }));

    if (selectedAccount) {
      fetchLobList(selectedAccount);
    } else {
      setLobOptions([]);
      setTaskOptions([]);
    }

    setTaskOptions([]);
  };

  const handleLobChange = (e) => {
    const selectedLob = e.target.value;

    setFormData((prev) => ({
      ...prev,
      lob: selectedLob,
      task: "",
    }));

    if (selectedLob && formData.profiledForAccount) {
      fetchTaskList(formData.profiledForAccount, selectedLob);
    } else {
      setTaskOptions([]);
    }
  };

  const handleTaskChange = (e) => {
    const selectedTask = e.target.value;

    setFormData((prev) => ({
      ...prev,
      task: selectedTask,
    }));
  };

  const showToast = (type, message) => {
    setToast({ show: true, type, message });

    setTimeout(() => {
      setToast({ show: false, type: "", message: "" });
    }, 3000);
  };

  const handleRecruiterChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      recruiter: e.target.value,
    }));
  };

  const handleDateChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const markApplicantAsViewed = (applicationId) => {
    const id = String(applicationId);

    setViewedApplicants((prev) => {
      if (prev.includes(id)) return prev;

      const updated = [...prev, id];
      localStorage.setItem("viewedApplicants", JSON.stringify(updated));
      return updated;
    });
  };

  const showReferralField =
    formData.candidatesource === "Referral" ||
    formData.candidatesource === "QuickApp - Referral";

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setFormData((prev) => ({
        ...prev,
        resume: file,
      }));
    }
  };

  const handleUpdateLifecycle = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formDataToSend = new FormData();

      formDataToSend.append("applicationid", formData.applicationid);
      formDataToSend.append("department", formData.department || "");
      formDataToSend.append("roleProfiled", formData.roleProfiled || "");
      formDataToSend.append(
        "profiledForAccount",
        formData.profiledForAccount || "N/A",
      );
      formDataToSend.append("lob", formData.lob || "N/A");
      formDataToSend.append("task", formData.task || "N/A");
      formDataToSend.append("accountCode", formData.accountCode || "");

      const normalizeDate = (date) => {
        if (!date || date === "") return "";
        const d = new Date(date);
        return isNaN(d.getTime())
          ? "1900-01-01"
          : d.toISOString().split("T")[0];
      };

      formDataToSend.append(
        "initialInterviewDate",
        normalizeDate(formData.initialInterviewDate),
      );
      formDataToSend.append(
        "initialInterviewStatus",
        formData.initialInterviewStatus || "",
      );
      formDataToSend.append(
        "skillsAssessmentDate",
        normalizeDate(formData.skillsAssessmentDate),
      );
      formDataToSend.append(
        "skillsAssessmentStatus",
        formData.skillsAssessmentStatus || "",
      );
      formDataToSend.append(
        "clientInterviewDate",
        normalizeDate(formData.clientInterviewDate),
      );
      formDataToSend.append(
        "clientInterviewStatus",
        formData.clientInterviewStatus || "",
      );
      formDataToSend.append(
        "finalInterviewDate",
        normalizeDate(formData.finalInterviewDate),
      );
      formDataToSend.append(
        "finalInterviewStatus",
        formData.finalInterviewStatus || "",
      );
      formDataToSend.append(
        "jobOfferDate",
        normalizeDate(formData.jobOfferDate),
      );
      formDataToSend.append("jobOfferStatus", formData.jobOfferStatus || "");
      formDataToSend.append(
        "onboardingDate",
        normalizeDate(formData.onboardingDate),
      );
      formDataToSend.append(
        "onboardingStatus",
        formData.onboardingStatus || "",
      );
      formDataToSend.append(
        "endorsementDateTime",
        normalizeDate(formData.endorsementDateTime),
      );
      formDataToSend.append(
        "endorsementStatus",
        formData.endorsementStatus || "",
      );
      formDataToSend.append(
        "dateUpdated",
        new Date().toISOString().split("T")[0],
      );
      formDataToSend.append("overallStatus", formData.overallStatus || "");
      formDataToSend.append("fallout", formData.fallout || "");
      formDataToSend.append(
        "falloutDate",
        normalizeDate(formData.falloutDateTime),
      );
      formDataToSend.append("remarks", formData.remarks || "");
      formDataToSend.append("recruiter", formData.recruiter || "");
      formDataToSend.append("workSetup", formData.workSetup || "");

      if (formData.resume) {
        formDataToSend.append("resume", formData.resume);
      }

      if (formData.candidatecvattachment) {
        formDataToSend.append(
          "candidatecvattachment",
          formData.candidatecvattachment,
        );
      }

      if (formData.department === "Operations") {
        const accountCode = await fetchAccountCode(
          formData.profiledForAccount,
          formData.lob,
          formData.task,
        );

        if (accountCode) {
          formDataToSend.set("accountCode", accountCode);
        }
      }

      const response = await api.put(
        `${SERVER_URL}/applicants/updateapplicant`,
        formDataToSend,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.data.success) {
        setIsUpdateCycleModalOpen(false);

        const freshRes = await axios.get(
          `${SERVER_URL}/applicants/getcandidate/${formData.applicationid}`,
          { withCredentials: true },
        );

        const rawData = normalizeObjectPayload(freshRes.data);

        setTrackers((prev) =>
          prev.map((item) =>
            item.applicationid === rawData.applicationid ? rawData : item,
          ),
        );

        setSelected(rawData);
        setFormData({});

        setStatusModal({
          isOpen: true,
          type: "success",
          message: "Lifecycle updated successfully.",
        });
      } else {
        setStatusModal({
          isOpen: true,
          type: "error",
          message: "Failed to update lifecycle.",
        });
      }
    } catch (error) {
      console.error("Update error:", error);

      setStatusModal({
        isOpen: true,
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.response?.data?.sqlMessage ||
          "Server error occurred.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sendVoiceRecordingEmail = async () => {
    if (!formData.candidateemail1 || !formData.applicationid) {
      alert("Email and Applicant ID are required.");
      return;
    }

    setIsSendingVoice(true);

    try {
      const response = await axios.post(
        `${SERVER_URL}/emails/voice_recording_email`,
        {
          emailAddress: formData.candidateemail1,
          applicantID: formData.applicationid,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        alert("Voice recording email sent successfully.");
      } else {
        alert("Failed to send voice recording email.");
      }
    } catch (error) {
      console.error("Error sending voice recording email:", error);
      alert(
        "An error occurred while sending the voice recording instructions.",
      );
    } finally {
      setIsSendingVoice(false);
    }
  };

  const sendTypingTestEmail = async () => {
    if (!formData.candidateemail1 || !formData.applicationid) {
      alert("Email and Applicant ID are required.");
      return;
    }

    setIsSendingTyping(true);

    try {
      const response = await axios.post(
        `${SERVER_URL}/emails/typing_test_email`,
        {
          emailAddress: formData.candidateemail1,
          applicantID: formData.applicationid,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        alert("Typing test email sent successfully.");
      } else {
        alert("Failed to send typing test email.");
      }
    } catch (error) {
      console.error("Error sending typing test email:", error);
      alert("An error occurred while sending the typing test email.");
    } finally {
      setIsSendingTyping(false);
    }
  };

  const sendEOLTestEmail = async () => {
    if (!formData.candidateemail1 || !formData.applicationid) {
      alert("Email and Applicant ID are required.");
      return;
    }

    setIsSendingEOL(true);

    try {
      const response = await axios.post(
        `${SERVER_URL}/emails/eol_email`,
        {
          emailAddress: formData.candidateemail1,
          applicantID: formData.applicationid,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        alert("EOL Assessment email sent successfully!");
      } else {
        alert("Failed to send EOL Assessment email.");
      }
    } catch (error) {
      console.error("Error sending EOL email:", error);
      alert("An error occurred while sending the email.");
    } finally {
      setIsSendingEOL(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();

    if (isSaving) return;

    setIsSaving(true);

    try {
      const formDataToSend = new FormData();
      let resumeUploaded = false;

      Object.keys(formData).forEach((key) => {
        if (key === "resume" && formData[key]) {
          formDataToSend.append("resume", formData[key]);
          resumeUploaded = true;
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      const response = await axios.put(
        `${SERVER_URL}/applicants/editapplicant`,
        formDataToSend,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (response.data.success) {
        if (resumeUploaded && formData.candidateemail1) {
          await sendAcknowledgmentEmail();
        }

        const updatedId =
          formData.applicationid || formData.applicationId || formData.id;

        const updatedSelected = {
          ...selected,
          ...formData,
          applicationid: updatedId,
        };

        setSelected(updatedSelected);
        setFormData(updatedSelected);
        setIsEditModalOpen(false);

        setStatusModal({
          isOpen: true,
          type: "success",
          message: "Candidate updated successfully.",
        });

        await fetchData();
      } else {
        setStatusModal({
          isOpen: true,
          type: "error",
          message: "Failed to update candidate.",
        });
      }
    } catch (error) {
      console.error("❌ Edit failed:", error);

      setStatusModal({
        isOpen: true,
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.response?.data?.sqlMessage ||
          "Server error occurred.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSaving) return;

    setIsSaving(true);

    try {
      const checkResponse = await axios.post(
        `${SERVER_URL}/auth/check-email-exists`,
        {
          email1: formData.candidateemail1,
          email2: formData.candidateemail2,
        },
        { withCredentials: true },
      );

      if (checkResponse.data.exists) {
        showToast("error", "Email address already exists in the system.");
        setIsSaving(false);
        return;
      }

      const formatNamePart = (part) =>
        part && part !== "N/A" ? part.trim() : "";

      const candidatename = [
        formatNamePart(formData.nameTitle),
        formatNamePart(formData.firstName),
        formatNamePart(formData.middleName),
        formatNamePart(formData.lastName),
        formatNamePart(formData.nameSuffix),
      ]
        .filter(Boolean)
        .join(" ");

      const formDataWithAttachment = new FormData();
      let resumeUploaded = false;

      Object.keys(formData).forEach((key) => {
        if (key === "resume" && formData[key]) {
          formDataWithAttachment.append(key, formData[key]);
          resumeUploaded = true;
        } else {
          formDataWithAttachment.append(key, formData[key]);
        }
      });

      formDataWithAttachment.append("candidatename", candidatename);

      const response = await axios.post(
        `${SERVER_URL}/applicants/addapplicants`,
        formDataWithAttachment,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.data.success) {
        if (resumeUploaded && formData.candidateemail1) {
          await sendAcknowledgmentEmail();
        }

        setIsNewModalOpen(false);

        setStatusModal({
          isOpen: true,
          type: "success",
          message: "Candidate added successfully.",
        });

        await fetchData();
        setFormData(INITIAL_FORM_DATA);
      } else {
        setStatusModal({
          isOpen: true,
          type: "error",
          message: "Failed to add candidate.",
        });
      }
    } catch (error) {
      console.error("❌ Submit failed:", error);

      setStatusModal({
        isOpen: true,
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.response?.data?.sqlMessage ||
          "Server error occurred.",
      });
    } finally {
      setIsSaving(false);
      setFormData(INITIAL_FORM_DATA);
    }
  };

  const sendAcknowledgmentEmail = async () => {
    try {
      await axios.post(
        `${SERVER_URL}/emails/send_acknowledgement`,
        {
          email: formData.candidateemail1,
        },
        { withCredentials: true },
      );

      alert(`Acknowledgment email sent to ${formData.candidateemail1}.`);
    } catch (error) {
      console.error("Error sending email:", error);
      alert(`Failed to send email to ${formData.candidateemail1}.`);
    }
  };

  function calculateMargin() {
    const billRateNum = parseFloat(billRate) || 0;
    const billableHoursNum = parseFloat(billableHours) || 0;
    let askingSalaryNum = parseFloat(askingSalary) || 0;
    const conversionRateNum = parseFloat(conversionRate) || 0;

    if (nightDiff) {
      askingSalaryNum += askingSalaryNum * 0.1;
    }

    if (
      !billRateNum ||
      !billableHoursNum ||
      !askingSalaryNum ||
      !conversionRateNum
    ) {
      setMargin("");
      setBorderColor("#000");
      return;
    }

    const revenue = billRateNum * billableHoursNum * 21.66;
    const cost = askingSalaryNum / conversionRateNum;

    if (revenue === 0) {
      setMargin("N/A");
      setBorderColor("#000");
      return;
    }

    const marginCalc = ((revenue - cost) / revenue) * 100;

    setMargin(marginCalc.toFixed(2));

    if (marginCalc >= 80) setBorderColor("blue");
    else if (marginCalc >= 70) setBorderColor("green");
    else if (marginCalc >= 60) setBorderColor("orange");
    else setBorderColor("red");
  }

  const resetForm = () => {
    setAskingSalary("");
    setNightDiff(false);
    setBillRate("");
    setBillableHours("");
    setConversionRate("");
    setMargin("");
    setBorderColor("#000");
  };

  const downloadExcel = async () => {
    if (filteredTrackers.length === 0) {
      alert("No data to download.");
      return;
    }

    const dlDate = new Date();
    const formattedDLDate = dlDate.toISOString().slice(2, 10).replace(/-/g, "");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Callmax Solutions";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("ApplicantsList");

    const headers = Object.keys(filteredTrackers[0]);

    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.max(header.length + 5, 20),
    }));

    filteredTrackers.forEach((row) => {
      worksheet.addRow(row);
    });

    // Header styling
    const headerRow = worksheet.getRow(1);

    headerRow.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };

    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4D68AA" },
    };

    headerRow.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    // Freeze header row
    worksheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    // Auto-filter
    worksheet.autoFilter = {
      from: "A1",
      to: `${String.fromCharCode(64 + headers.length)}1`,
    };

    // Auto-size columns
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

    saveAs(blob, `ApplicantsList_${formattedDLDate}.xlsx`);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
      <SidebarIcons />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header pageTitle="Recruitment Tracker" />

        <div className="flex min-h-0 flex-1 overflow-hidden text-[13px]">
          <div className="hidden w-[210px] shrink-0 overflow-y-auto border-r bg-white px-3 py-3 lg:flex lg:flex-col lg:gap-3 xl:w-[225px]">
            <h2 className="text-xs font-semibold uppercase text-slate-600">
              Filters
            </h2>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                Sort by
              </label>
              <button
                className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700"
                onClick={() =>
                  setSortOrder((prev) =>
                    prev === "newest" ? "oldest" : "newest",
                  )
                }
              >
                {sortOrder === "newest" ? "Newest First" : "Oldest First"}
              </button>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                Status
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {["All", ...uniqueStatuses].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      statusFilter === s
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 hover:bg-slate-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <label className="block text-[11px] font-semibold uppercase text-slate-500">
                Date Range
              </label>

              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={() => setShowCalendar((prev) => !prev)}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm outline-none focus:ring-2 focus:ring-blue-300"
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
                <div className="absolute z-50 mt-2 rounded-xl border border-slate-200 bg-white shadow-lg">
                  <DateRange
                    ranges={dateRange}
                    onChange={(item) => setDateRange([item.selection])}
                    maxDate={new Date()}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                Position
              </label>
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <option value="All">All</option>
                {uniquePositions.map((pos, i) => (
                  <option key={i} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                Application Source
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <option value="All">All</option>
                {uniqueSources.map((src, i) => (
                  <option key={i} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                Work Setup
              </label>
              <select
                value={setupFilter}
                onChange={(e) => setSetupFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <option value="All">All</option>
                {uniqueSetups.map((setup, i) => (
                  <option key={i} value={setup}>
                    {setup}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                Recruiter
              </label>
              <select
                value={recruiterFilter}
                onChange={(e) => setRecruiterFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <option value="All">All</option>
                {uniqueRecruiters.map((rec, i) => (
                  <option key={i} value={rec}>
                    {rec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-3">
            <div className="mb-2 flex shrink-0 flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                  Search
                </label>
                <div className="relative w-full sm:w-[320px] xl:w-[380px]">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Candidate name, position..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <img
                    src={searchIcon}
                    className="absolute left-3 top-1/2 w-4 -translate-y-1/2 opacity-60"
                    alt="Search"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setFormData(INITIAL_FORM_DATA);
                    setIsNewModalOpen(true);
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white shadow-sm hover:bg-blue-700"
                >
                  Add New Candidates
                </button>

                <button
                  onClick={() => setIsGMModalOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm hover:bg-slate-300"
                  title="Open GM Calculator"
                >
                  <HiCalculator className="text-lg" />
                  <span className="hidden sm:inline">GM</span>
                </button>

                <button
                  onClick={downloadExcel}
                  className="flex items-center gap-2 rounded-lg bg-green-200 px-4 py-2.5 text-sm text-green-900 shadow-sm hover:bg-green-300"
                  title="Download Excel"
                >
                  <HiDownload className="text-lg" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="h-full overflow-auto">
                <table className="min-w-[980px] w-full table-fixed text-[13px]">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] uppercase tracking-wide text-slate-600">
                    <tr>
                      <th
                        style={{ width: "9%" }}
                        className="px-3 py-2 text-left"
                      >
                        Application Date
                      </th>
                      <th
                        style={{ width: "13%" }}
                        className="px-3 py-2 text-left"
                      >
                        Candidate Name
                      </th>
                      <th
                        style={{ width: "10%" }}
                        className="px-3 py-2 text-left"
                      >
                        Source
                      </th>
                      <th
                        style={{ width: "15%" }}
                        className="px-3 py-2 text-left"
                      >
                        Role Applied
                      </th>
                      <th
                        style={{ width: "8%" }}
                        className="px-3 py-2 text-left"
                      >
                        Setup
                      </th>
                      <th
                        style={{ width: "19%" }}
                        className="px-3 py-2 text-left"
                      >
                        Resume
                      </th>
                      <th
                        style={{ width: "10%" }}
                        className="px-3 py-2 text-left"
                      >
                        Status
                      </th>
                      <th
                        style={{ width: "8%" }}
                        className="px-3 py-2 text-left"
                      >
                        Recruiter
                      </th>
                      <th
                        style={{ width: "8%" }}
                        className="px-3 py-2 text-left"
                      >
                        Remarks
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTrackers.map((item, idx) => (
                      <tr
                        key={item.id || item.applicationid || idx}
                        className={`cursor-pointer border-b border-slate-100 transition-colors ${
                          selected?.id === item.id
                            ? "bg-blue-50"
                            : "hover:bg-slate-50"
                        }`}
                        onClick={() => setSelected(item)}
                      >
                        <td className="px-3 py-2 align-top">
                          <div className="whitespace-nowrap">
                            {formatDate(item.applicationdatetime)}
                          </div>
                        </td>

                        <td className="px-3 py-2 align-top font-semibold">
                          <div className="line-clamp-2">
                            {displayValue(item.candidatename)}
                          </div>
                        </td>

                        <td className="px-3 py-2 align-top">
                          <div className="line-clamp-2">
                            {displayValue(item.candidatesource)}
                          </div>
                        </td>

                        <td className="px-3 py-2 align-top">
                          <div className="line-clamp-2">
                            {displayValue(item.applied_position_title)}
                          </div>
                        </td>

                        <td className="px-3 py-2 align-top">
                          <div className="line-clamp-2">
                            {displayValue(item.worksetup)}
                          </div>
                        </td>

                        <td className="px-3 py-2 align-top">
                          {item.candidatecvattachment ? (
                            <button
                              title={item.candidatecvattachment}
                              className={`block max-w-full truncate text-left focus:outline-none ${
                                viewedApplicants.includes(
                                  String(item.applicationid),
                                )
                                  ? "text-gray-500"
                                  : "text-blue-600 hover:underline"
                              }`}
                              onClick={async (e) => {
                                e.stopPropagation();

                                try {
                                  const newTab = window.open("", "_blank");

                                  const res = await apiFetch(
                                    `${SERVER_URL}/mediafiles/resume/${item.candidatecvattachment}`,
                                  );

                                  const data = await res.json();

                                  if (!data?.url) {
                                    alert("Resume URL not available.");
                                    if (newTab) newTab.close();
                                    return;
                                  }

                                  const lowerUrl = String(
                                    data.url,
                                  ).toLowerCase();

                                  const isWordDoc =
                                    lowerUrl.includes(".doc") ||
                                    lowerUrl.includes(".docx");

                                  const viewerUrl = isWordDoc
                                    ? `https://docs.google.com/gview?url=${encodeURIComponent(
                                        data.url,
                                      )}&embedded=true`
                                    : data.url;

                                  markApplicantAsViewed(item.applicationid);

                                  if (newTab) {
                                    newTab.location.href = viewerUrl;
                                  } else {
                                    window.open(
                                      viewerUrl,
                                      "_blank",
                                      "noopener,noreferrer",
                                    );
                                  }
                                } catch (err) {
                                  console.error("Resume fetch error:", err);
                                  alert("Unable to load resume.");
                                }
                              }}
                            >
                              {item.candidatecvattachment}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="px-3 py-2 align-top">
                          <div className="line-clamp-2">
                            {displayValue(item.overall_status)}
                          </div>
                        </td>

                        <td className="px-3 py-2 align-top">
                          <div className="line-clamp-2">
                            {displayValue(item.recruiter)}
                          </div>
                        </td>

                        <td className="px-3 py-2 align-top">
                          <div className="line-clamp-2">
                            {displayValue(item.remarks) !== "—"
                              ? String(item.remarks)
                              : "—"}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!filteredTrackers.length && !loading && (
                      <tr>
                        <td
                          colSpan="9"
                          className="py-6 text-center text-slate-400"
                        >
                          No records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="hidden w-[320px] shrink-0 flex-col border-l border-slate-200 bg-white xl:flex 2xl:w-[350px]">
            {selected ? (
              <>
                {(() => {
                  const preview = formData?.applicationid ? formData : selected;

                  return (
                    <div className="border-b border-slate-100 p-5 pb-4">
                      <h3 className="truncate text-lg font-semibold">
                        {displayValue(preview?.candidatename)}
                      </h3>

                      <div className="mt-1 truncate text-xs font-bold uppercase text-slate-500">
                        {displayValue(preview?.applied_position_title)}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <Info
                          label="Status"
                          value={displayValue(preview?.overall_status)}
                        />
                        <Info
                          label="Recruiter"
                          value={displayValue(preview?.recruiter)}
                        />
                        <Info
                          label="Applied On"
                          value={formatDate(preview?.applicationdatetime)}
                        />
                        <Info
                          label="Work Setup"
                          value={displayValue(preview?.worksetup)}
                        />
                      </div>
                    </div>
                  );
                })()}

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase text-slate-500">
                    Details
                  </p>

                  <div className="mb-2 flex gap-6 overflow-x-auto border-b border-slate-200">
                    {Object.keys(categories).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setSelectedTab(tab)}
                        className={`whitespace-nowrap pb-2 text-sm font-medium transition ${
                          selectedTab === tab
                            ? "border-b-2 border-blue-600 text-blue-600"
                            : "text-slate-500 hover:text-blue-600"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="mb-4 flex-1 overflow-y-auto pr-1">
                    <div className="flex flex-col gap-3 pb-6">
                      {(() => {
                        const preview = formData?.applicationid
                          ? formData
                          : selected;

                        return categories[selectedTab]
                          ?.filter(
                            (field) =>
                              ![
                                "candidatecvattachment",
                                "candidatename",
                                "gender",
                                "candidatephone1",
                                "candidatephone2",
                                "candidateemail1",
                                "candidateemail2",
                                "candidatesource",
                                "applied_role",
                              ].includes(field),
                          )
                          .map((field) => (
                            <Info
                              key={field}
                              label={getFieldLabel(field)}
                              value={renderFieldValue(
                                field,
                                preview?.[field] ?? preview?.[camelize(field)],
                              )}
                            />
                          ));
                      })()}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 p-5">
                  <div className="flex flex-col gap-2 2xl:flex-row">
                    <button
                      onClick={async () => {
                        try {
                          const res = await axios.get(
                            `${SERVER_URL}/applicants/getcandidate/${selected.applicationid}`,
                            { withCredentials: true },
                          );

                          const rawData = normalizeObjectPayload(res.data);
                          const normalized = normalizeFormData(rawData);

                          setSelected(rawData);
                          setFormData(normalized);
                          setIsEditModalOpen(true);
                        } catch (error) {
                          console.error(
                            "Failed to fetch candidate data:",
                            error,
                          );
                          alert(
                            "Failed to load candidate info. Please try again.",
                          );
                        }
                      }}
                      className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm text-white shadow-sm hover:bg-blue-700"
                    >
                      Edit Candidate Info
                    </button>

                    <button
                      className="w-full rounded-xl bg-slate-600 px-4 py-2.5 text-sm text-white shadow-sm hover:bg-slate-700"
                      onClick={async () => {
                        try {
                          const freshRes = await axios.get(
                            `${SERVER_URL}/applicants/getcandidate/${selected.applicationid}`,
                            { withCredentials: true },
                          );

                          const rawData = normalizeObjectPayload(freshRes.data);
                          const normalized = normalizeFormData(rawData);

                          setSelected(rawData);
                          setFormData(normalized);
                          setIsUpdateCycleModalOpen(true);
                        } catch (error) {
                          console.error(
                            "Failed to fetch candidate lifecycle data:",
                            error,
                          );
                          alert(
                            "Failed to load candidate info. Please try again.",
                          );
                        }
                      }}
                    >
                      Update Lifecycles
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-4 text-sm text-slate-400">
                Select a tracker entry to view details
              </div>
            )}
          </div>

          <NewCandidateModal
            isOpen={isNewModalOpen}
            onClose={() => setIsNewModalOpen(false)}
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleSubmit}
            handleChange={handleChange}
            handleFileChange={handleFileChange}
            isSaving={isSaving}
            showReferralField={showReferralField}
          />

          <EditCandidateInfoModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            formData={formData}
            handleEdit={handleEdit}
            handleChange={handleChange}
            handleFileChange={handleFileChange}
            isSaving={isSaving}
            showReferralField={showReferralField}
            markApplicantAsViewed={markApplicantAsViewed}
          />

          <UpdateCandidateLifecycleModal
            isOpen={isUpdateCycleModalOpen}
            onClose={() => {
              setIsUpdateCycleModalOpen(false);
              setFormData({});
            }}
            selected={selected}
            formData={formData}
            setFormData={setFormData}
            handleUpdateLifecycle={handleUpdateLifecycle}
            handleChange={handleChange}
            handleDateChange={handleDateChange}
            handleAccountChange={handleAccountChange}
            handleLobChange={handleLobChange}
            handleTaskChange={handleTaskChange}
            handleRecruiterChange={handleRecruiterChange}
            accountOptions={accountOptions}
            lobOptions={lobOptions}
            taskOptions={taskOptions}
            recruiters={recruiters}
            markApplicantAsViewed={markApplicantAsViewed}
            extractFileName={extractFileName}
            sendVoiceRecordingEmail={sendVoiceRecordingEmail}
            sendTypingTestEmail={sendTypingTestEmail}
            sendEOLTestEmail={sendEOLTestEmail}
            isSaving={isSaving}
            isSendingVoice={isSendingVoice}
            isSendingTyping={isSendingTyping}
            isSendingEOL={isSendingEOL}
          />

          {isGMModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
              <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between border-b pb-3">
                  <h2 className="text-xl font-semibold text-gray-800">
                    GM Calculator
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Asking Salary (₱)
                    </label>
                    <input
                      type="number"
                      value={askingSalary}
                      onChange={(e) => setAskingSalary(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="Enter asking salary"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={nightDiff}
                      onChange={() => setNightDiff(!nightDiff)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium">
                      Add 10% Night Diff
                    </span>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Bill Rate per Hour ($)
                    </label>
                    <input
                      type="number"
                      value={billRate}
                      onChange={(e) => setBillRate(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="Enter bill rate"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Billable Hours / Day
                    </label>
                    <input
                      type="number"
                      value={billableHours}
                      onChange={(e) => setBillableHours(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="Enter billable hours"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Conversion Rate (₱)
                    </label>
                    <input
                      type="number"
                      value={conversionRate}
                      onChange={(e) => setConversionRate(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="Enter conversion rate"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-semibold">
                      Margin (%)
                    </label>
                    <div
                      className="w-full rounded-lg border-4 py-4 text-center text-2xl font-bold"
                      style={{ borderColor }}
                    >
                      {margin ? `${margin}%` : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t pt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGMModalOpen(false)}
                    className="rounded-md border px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {statusModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="relative w-[340px] animate-fade-in-up rounded-xl bg-white p-10 text-center shadow-xl">
                <button
                  onClick={() =>
                    setStatusModal({ isOpen: false, type: "", message: "" })
                  }
                  className="absolute right-4 top-3 text-lg text-slate-400 hover:text-red-500"
                >
                  &times;
                </button>

                <div className="relative mb-4 flex justify-center">
                  <span
                    className={`absolute inline-flex h-16 w-16 animate-ping-slow rounded-full ${
                      statusModal.type === "success"
                        ? "bg-blue-300"
                        : "bg-red-300"
                    } opacity-75`}
                  ></span>

                  {statusModal.type === "success" ? (
                    <HiCheckCircle className="relative z-10 text-7xl text-blue-600" />
                  ) : (
                    <HiXCircle className="relative z-10 text-7xl text-red-500" />
                  )}
                </div>

                <h3 className="mb-2 text-lg font-semibold">
                  {statusModal.type === "success" ? "Success" : "Error"}
                </h3>

                <p className="text-sm text-slate-600">{statusModal.message}</p>
              </div>
            </div>
          )}
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
}

const Info = ({ label, value }) => (
  <div>
    <p className="mb-1 text-[11px] font-semibold uppercase text-slate-500">
      {label}
    </p>
    <p className="break-words text-sm text-slate-800">{value}</p>
  </div>
);

export default RecruitmentTracker;
