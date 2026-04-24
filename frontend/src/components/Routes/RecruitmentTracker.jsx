import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { DateRange } from "react-date-range";
import { useNavigate } from "react-router-dom";
import SidebarIcons from "../../components/common/Sidebar";
import Header from "../../components/common/Header";
import searchIcon from "../../assets/search_symbol.png";
import { SERVER_URL } from "../lib/constants";
import axios from "axios";
import Toast from "../../components/common/Toast";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { HiDownload, HiCalculator } from "react-icons/hi"; // Heroicons calculator
import { FaCalculator } from "react-icons/fa"; // FontAwesome Calculator icon
import NewCandidateModal from "../../components/modals/NewCandidateModal";
import EditCandidateInfoModal from "../../components/modals/EditCandidateInfoModal";
import UpdateCandidateLifecycleModal from "../../components/modals/UpdateCandidateLifecycleModal";

import { HiCheckCircle, HiXCircle } from "react-icons/hi";
import { apiFetch } from "../lib/apiFetch";

// Helper
const formatDate = (iso) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "—" : format(date, "MMM dd, yyyy");
};

function RecruitmentTracker({ user }) {
  const navigate = useNavigate();
  const userName = user.fullName || localStorage.getItem("name") || "User";
  const userid = user.userid || localStorage.getItem("userid") || "";
  const [trackers, setTrackers] = useState([]);
  const [filteredTrackers, setFilteredTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const [search, setSearch] = useState("");
  // const [userid, setUserId] = useState("");
  // const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");

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
  const [nightDiff, setNightDiff] = useState(false); // Night Diff checkbox state
  const [billRate, setBillRate] = useState("");
  const [billableHours, setBillableHours] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [margin, setMargin] = useState("");
  const [borderColor, setBorderColor] = useState("#000"); // Default color
  const [recruiters, setRecruiters] = useState([]); // State for recruiter list
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  // Define at component scope (before useEffect)
  const fetchData = async () => {
    try {
      setLoading(true); // Start loading

      const response = await apiFetch(
        `${SERVER_URL}/applicants/recruitment-tracker`,
      );
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      const normalized = data.map(normalizeRow);
      setTrackers(normalized);
      setFilteredTrackers(normalized);
      setError(null); // Clear previous error
      console.log(
        `📊 Recruitment Tracker fetched ${
          Array.isArray(data) ? data.length : 0
        } rows`,
      );
    } catch (error) {
      console.error("❌ Error fetching tracker data:", error);
      setError(error.message || "Unknown error occurred");
    } finally {
      setLoading(false); // Always stop loading
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const uniquePositions = [
    ...new Set(trackers.map((t) => t.applied_position_title)),
  ];
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

  const handleLogout = async () => {
    try {
      await fetch(`${SERVER_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout failed:", err);
    }

    // 🔥 Force clean state + redirect
    navigate("/OauthLogin", { replace: true });
    window.location.reload(); // ensures session reset
  };

  const formatRangeLabel = () => {
    const { startDate, endDate } = dateRange[0];
    if (!startDate || !endDate) return "Select Date Range";
    return `${format(startDate, "MMM dd, yyyy")} - ${format(
      endDate,
      "MMM dd, yyyy",
    )}`;
  };

  //Account Dropdown
  const [accountOptions, setAccountOptions] = useState([]);
  const [lobOptions, setLobOptions] = useState([]);
  const [taskOptions, setTaskOptions] = useState([]);

  const fetchAccountList = async () => {
    try {
      // console.log("Calling API to fetch account list...");
      const response = await apiFetch(`${SERVER_URL}/accounts/accountlist`);

      if (!response.ok) {
        console.error(
          "Failed to fetch account list:",
          response.status,
          response.statusText,
        );
        throw new Error("Failed to fetch account list");
      }

      const data = await response.json();
      // console.log("Raw Data from API:", data);

      // Ensure unique accounts, normalize to lowercase
      const uniqueAccountsMap = new Map();
      data.forEach((item) => {
        const accountKey = item.ACCOUNT.toLowerCase(); // Normalize to lowercase
        if (!uniqueAccountsMap.has(accountKey)) {
          uniqueAccountsMap.set(accountKey, {
            ACCOUNT: item.ACCOUNT, // Keep original case for display
          });
        }
      });

      const uniqueAccounts = Array.from(uniqueAccountsMap.values()).sort(
        (a, b) =>
          a.ACCOUNT.toLowerCase().localeCompare(b.ACCOUNT.toLowerCase()),
      );

      // console.log("Processed Unique and Sorted Accounts:", uniqueAccounts);
      setAccountOptions(uniqueAccounts);
    } catch (error) {
      console.error("Error fetching account data:", error);
    }
  };

  const fetchLobList = async (account) => {
    try {
      // console.log(`Fetching LOBs for account: ${account}`);
      const response = await apiFetch(
        `${SERVER_URL}/accounts/lobList?account=${encodeURIComponent(
          account.toLowerCase(),
        )}`,
      );

      if (!response.ok) {
        console.error(
          "Failed to fetch LOB list:",
          response.status,
          response.statusText,
        );
        throw new Error("Failed to fetch LOB list");
      }

      const data = await response.json();
      // console.log("Fetched LOBs:", data);

      const uniqueLobs = data
        .map((item) => item.LOB)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      setLobOptions(uniqueLobs);
    } catch (error) {
      console.error("Error fetching LOB data:", error);
    }
  };

  const fetchTaskList = async (account, lob) => {
    try {
      // console.log(`Fetching Tasks for account: ${account}, lob: ${lob}`);
      const response = await apiFetch(
        `${SERVER_URL}/accounts/tasklist?account=${encodeURIComponent(
          account.toLowerCase(),
        )}&lob=${encodeURIComponent(lob.toLowerCase())}`, // Normalize to lowercase
      );

      if (!response.ok) {
        console.error(
          "Failed to fetch Task list:",
          response.status,
          response.statusText,
        );
        throw new Error("Failed to fetch Task list");
      }

      const data = await response.json();
      // console.log("Fetched Tasks:", data);

      const uniqueTasks = data
        .map((item) => item.TASK)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      setTaskOptions(uniqueTasks);
    } catch (error) {
      console.error("Error fetching Task data:", error);
    }
  };

  const fetchAccountCode = async (account, lob, task) => {
    try {
      // Check if the department is not "Operations"
      if (formData.department !== "Operations") {
        // console.log("Skipping fetchAccountCode as department is not 'Operations'");
        return null; // Skip and return null
      }

      // console.log(`Fetching ACCOUNTCODE for account: ${account}, lob: ${lob}, task: ${task}`);
      const response = await apiFetch(
        `${SERVER_URL}/accounts/accountcode?account=${encodeURIComponent(
          account.toLowerCase(),
        )}&lob=${encodeURIComponent(
          lob.toLowerCase(),
        )}&task=${encodeURIComponent(task.toLowerCase())}`, // Normalize to lowercase
      );

      if (!response.ok) {
        console.error(
          "Failed to fetch ACCOUNTCODE:",
          response.status,
          response.statusText,
        );
        throw new Error("Failed to fetch ACCOUNTCODE");
      }

      const data = await response.json();
      // console.log("Fetched ACCOUNTCODE:", data);
      return data.ACCOUNTCODE; // Return the ACCOUNTCODE
    } catch (error) {
      console.error("Error fetching ACCOUNTCODE data:", error);
      return null; // Return null if an error occurs
    }
  };

  const handleAccountChange = (e) => {
    const selectedAccount = e.target.value; // Use ACCOUNT directly
    setFormData((prev) => ({
      ...prev,
      profiledForAccount: selectedAccount,
      lob: "",
    }));

    if (selectedAccount) {
      fetchLobList(selectedAccount); // Fetch LOBs based on selected ACCOUNT
    } else {
      setLobOptions([]);
      setTaskOptions([]);
    }
    setTaskOptions([]);
  };

  const handleLobChange = (e) => {
    const selectedLob = e.target.value;
    setFormData((prev) => ({ ...prev, lob: selectedLob, task: "" }));

    if (selectedLob && formData.profiledForAccount) {
      fetchTaskList(formData.profiledForAccount, selectedLob); // Fetch Tasks based on selected Account and LOB
    } else {
      setTaskOptions([]); // Clear Task options if no LOB is selected
    }
  };

  const handleTaskChange = (e) => {
    const selectedTask = e.target.value;
    setFormData((prev) => ({ ...prev, task: selectedTask }));
  };

  useEffect(() => {
    if (isNewModalOpen) {
      fetchAccountList();
    }
  }, [isNewModalOpen]);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: "", message: "" });
    }, 3000); // Auto-hide after 3s
  };

  useEffect(() => {
    fetchRecruiters();
    fetchAccountList();
  }, []);

  const fetchRecruiters = async () => {
    try {
      const response = await axios.get(
        `${SERVER_URL}/applicants/recruiters-list`,
        { withCredentials: true },
      );

      // Extract the nested array
      const nestedRecruiters = response.data[0];

      // Remove duplicates (if necessary)
      const uniqueRecruiters = Array.from(
        new Set(nestedRecruiters.map((recruiter) => recruiter.NAME)),
      ).map((name) => {
        return nestedRecruiters.find((recruiter) => recruiter.NAME === name);
      });

      setRecruiters(uniqueRecruiters); // Set the unique recruiters array
    } catch (error) {
      console.error("Error fetching recruiters:", error);
    }
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
      // Interviews
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

  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: "", // "success" or "error"
    message: "",
  });

  useEffect(() => {
    if (statusModal.isOpen) {
      const timer = setTimeout(() => {
        setStatusModal({ isOpen: false, type: "", message: "" });
      }, 3000); // 3000 ms = 3 seconds

      return () => clearTimeout(timer); // Cleanup if component unmounts or modal closes early
    }
  }, [statusModal.isOpen]);

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

  //helper function
  const extractFileName = (url) => {
    if (!url) return "";
    return url.split("/").pop();
  };

  // For the modal
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateLifecycle = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formDataToSend = new FormData();

      // Append all necessary fields
      formDataToSend.append("applicationid", formData.applicationid);
      formDataToSend.append("department", formData.department);
      formDataToSend.append("roleProfiled", formData.roleProfiled);
      formDataToSend.append(
        "profiledForAccount",
        formData.profiledForAccount || "N/A",
      );
      formDataToSend.append("lob", formData.lob || "N/A");
      formDataToSend.append("task", formData.task || "N/A");

      // Account Code logic (same as backend will override anyway)
      formDataToSend.append("accountCode", formData.accountCode || "");

      // Dates (make sure they're in YYYY-MM-DD)
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

      // Resume upload (optional)
      if (formData.resume) {
        formDataToSend.append("resume", formData.resume);
      }

      // Existing resume name for fallback
      if (formData.candidatecvattachment) {
        formDataToSend.append(
          "candidatecvattachment",
          formData.candidatecvattachment,
        );
      }

      let accountCode = null;

      // Fetch the ACCOUNTCODE only if the department is "Operations"
      if (formData.department === "Operations") {
        accountCode = await fetchAccountCode(
          formData.profiledForAccount,
          formData.lob,
          formData.task,
        );

        // if (!accountCode) {
        //   alert("Failed to fetch ACCOUNTCODE. Please verify your selections.");
        //   setIsSaving(false);
        //   return;
        // }
      }

      const response = await axios.put(
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

        // ✅ Refetch single updated candidate
        const freshRes = await axios.get(
          `${SERVER_URL}/applicants/getcandidate/${formData.applicationid}`,
          { withCredentials: true },
        );
        const rawData = freshRes.data;
        const normalized = normalizeFormData(rawData);

        // ✅ Update table row in-place without re-fetching all data
        setTrackers((prev) =>
          prev.map((item) =>
            item.applicationid === rawData.applicationid ? rawData : item,
          ),
        );

        // ✅ Set selected row to updated data (for preview panel)
        setSelected(rawData);

        // ✅ Clear formData so preview falls back to `selected`
        setFormData({});

        // ✅ Optional: Refetch table if you need full refresh
        // await fetchData();

        setStatusModal({
          isOpen: true,
          type: "success",
          message: "Lifecycle updated successfully.",
        });
      } else {
        // showToast("error", "Update failed.");
        setStatusModal({
          isOpen: true,
          type: "error",
          message: "Failed to add candidate.",
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

  // Auto-switch QuickApp <-> QuickApp - Referral based on referral code presence
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
  }, [formData.applicationSource, formData.referralCode, setFormData]);

  useEffect(() => {
    // Automatically set "Successful Hire" if endorsementStatus is "Endorsed"
    if (
      formData.endorsementStatus === "Endorsed" &&
      formData.overallStatus !== "Successful Hire"
    ) {
      setFormData((prevData) => ({
        ...prevData,
        overallStatus: "Successful Hire",
      }));
    }
  }, [formData.endorsementStatus]);

  useEffect(() => {
    if (isUpdateCycleModalOpen) {
      fetchAccountList();
    }
  }, [isUpdateCycleModalOpen]);

  //localStorage to store viewed applicant IDs
  // Store viewed applicant IDs as an ARRAY (React-safe)
  const [viewedApplicants, setViewedApplicants] = useState(() => {
    const saved = localStorage.getItem("viewedApplicants");
    return saved ? JSON.parse(saved) : [];
  });

  // Debug: confirm state changes
  useEffect(() => {
    console.log("Viewed applicants:", viewedApplicants);
  }, [viewedApplicants]);

  // helper to update localStorage when a CV is viewed
  const markApplicantAsViewed = (applicationId) => {
    const id = String(applicationId);

    setViewedApplicants((prev) => {
      if (prev.includes(id)) return prev;

      const updated = [...prev, id];
      localStorage.setItem("viewedApplicants", JSON.stringify(updated));
      return updated;
    });
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
      // Add lifecycle field labels here if needed
    };

    return labels[field] || field.replace(/_/g, " ");
  };

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

  const normalizeRow = (row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k,
        v === null || v === "null" ? "" : v,
      ]),
    );

  // const normalizeFormData = (data) => {
  //   const normalized = {};

  //   Object.keys(data || {}).forEach((key) => {
  //     const value = data[key];

  //     normalized[key] =
  //       value === null || value === undefined || value === "null" ? "" : value;
  //   });

  //   return normalized;
  // };

  const normalizeFormData = (data) => {
    const mapping = {
      // Stage statuses and dates
      initialinterviewstatus: "initialInterviewStatus",
      initialinterviewdatetime: "initialInterviewDate",

      skillsassessmentstatus: "skillsAssessmentStatus",
      skillsassessmentdatetime: "skillsAssessmentDate",

      clientinterviewstatus: "clientInterviewStatus",
      clientinterviewdatetime: "clientInterviewDate",

      finalinterviewstatus: "finalInterviewStatus",
      finalinterviewdatetime: "finalInterviewDate",

      jobofferstatus: "jobOfferStatus",
      jobofferdatetime: "jobOfferDate",

      onboardingstatus: "onboardingStatus",
      onboardingdatetime: "onboardingDate",

      endorsementstatus: "endorsementStatus",
      endorsementdatetime: "endorsementDateTime",

      falloutdatetime: "falloutDateTime",
      fallout: "fallout",

      // General fields
      overall_status: "overallStatus",
      profiled_account: "profiledForAccount",
      profiled_lob: "lob",
      profiled_task: "task",
      profiled_role: "roleProfiled",
      worksetup: "workSetup",
      remarks: "remarks",
      recruiter: "recruiter",

      // Core fields
      applicationid: "applicationid",
      candidatename: "candidatename",
      gender: "gender",
      applied_role: "applied_role",
      applied_position_title: "applied_position_title",

      // Resume / attachments
      candidatecvattachment: "candidatecvattachment",
      resume: "resume", // Optional: in case pre-filled for reupload
    };

    const normalized = {};

    Object.keys(data || {}).forEach((key) => {
      const mappedKey = mapping[key] || key;
      let value = data[key];

      // Convert "1900-01-01" to empty string for date fields
      if (typeof value === "string" && value.trim() === "1900-01-01") {
        value = "";
      }

      // Convert null/undefined/"null" to empty string
      if (value === null || value === undefined || value === "null") {
        value = "";
      }

      normalized[mappedKey] = value;
    });

    return normalized;
  };

  const camelize = (str) => str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

  const renderFieldValue = (field, value) => {
    if (!value) return "—";

    if (field.includes("date") || camelize(field).includes("Date")) {
      return formatDate(value);
    }

    if (field === "candidatecvattachment") {
      return (
        <a
          href={`${SERVER_URL}/mediafiles/resume/${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline break-all"
          title={value}
        >
          {value}
        </a>
      );
    }

    return value;
  };

  //For the Edit Modal
  const handleEdit = async (e) => {
    e.preventDefault();

    if (isSaving) return;
    setIsSaving(true);

    try {
      const formDataToSend = new FormData();
      let resumeUploaded = false; // ✅ Declare it here

      Object.keys(formData).forEach((key) => {
        if (key === "resume" && formData[key]) {
          formDataToSend.append("resume", formData[key]);
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
        // ✅ Send acknowledgment email only if resume was uploaded
        if (resumeUploaded && formData.candidateemail1) {
          await sendAcknowledgmentEmail();
        }

        // ✅ Force ID from response or fallback to existing formData
        const updatedId =
          formData.applicationid || formData.applicationId || formData.id;

        // ✅ Merge formData into selected
        const updatedSelected = {
          ...selected,
          ...formData,
          applicationid: updatedId,
        };

        setSelected(updatedSelected);
        setFormData(updatedSelected);

        // showToast("success", "Candidate updated successfully.");
        setIsEditModalOpen(false);

        setStatusModal({
          isOpen: true,
          type: "success",
          message: "Candidate updated successfully.",
        });

        // ✅ Optional: Refresh trackers list and restore selected from refreshed list
        await fetchData();
        const updated = trackers.find(
          (t) =>
            t.applicationid === updatedId ||
            t.applicationId === updatedId ||
            t.id === updatedId,
        );
        if (updated) setSelected(updated);
      } else {
        // showToast("error", "Update failed.");
        setStatusModal({
          isOpen: true,
          type: "error",
          message: "Failed to update candidate.",
        });
      }
    } catch (error) {
      console.error("❌ Edit failed:", error);
      // showToast(
      //   "error",
      //   error?.response?.data?.message || "Error updating candidate."
      // );
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

  const showReferralField =
    formData.candidatesource === "Referral" ||
    formData.candidatesource === "QuickApp - Referral";

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        resume: file, // 🔥 MUST be "resume"
      }));
    }
  };

  // Add new
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSaving) return;
    setIsSaving(true);

    try {
      // 🔍 Check if email already exists
      const checkResponse = await axios.post(
        `${SERVER_URL}/auth/check-email-exists`,
        {
          email1: formData.candidateemail1,
          email2: formData.candidateemail2,
        },
      );

      if (checkResponse.data.exists) {
        // alert("Email address already exists in the system.");
        showToast("error", "Email address already exists in the system.");
        setIsSaving(false);
        return;
      }

      /* ======================================================
       ✅ CONSTRUCT candidatename FROM NAME PARTS
    ====================================================== */
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

      /* ======================================================
       ✅ PREPARE FORM DATA (WITH candidatename)
    ====================================================== */
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

      // append candidatename explicitly
      formDataWithAttachment.append("candidatename", candidatename);

      /* ======================================================
       ✅ SUBMIT TO BACKEND
    ====================================================== */
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
        // ✅ Send acknowledgment email only if resume exists
        if (resumeUploaded && formData.candidateemail1) {
          await sendAcknowledgmentEmail();
        }

        setIsNewModalOpen(false);
        setStatusModal({
          isOpen: true,
          type: "success",
          message: "Candidate added successfully.",
        });

        fetchData();
        setFormData(INITIAL_FORM_DATA);
      } else {
        // showToast("error", "Error submitting record. Please try again.");
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

  const calculateMargin = () => {
    const billRateNum = parseFloat(billRate) || 0;
    const billableHoursNum = parseFloat(billableHours) || 0;
    let askingSalaryNum = parseFloat(askingSalary) || 0;
    const conversionRateNum = parseFloat(conversionRate) || 0;

    // Add 10% to asking salary if Night Diff is checked
    if (nightDiff) {
      askingSalaryNum += askingSalaryNum * 0.1;
    }

    // Ensure all fields are filled
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

    // Set border color based on margin percentage
    if (marginCalc >= 80) setBorderColor("blue");
    else if (marginCalc >= 70) setBorderColor("green");
    else if (marginCalc >= 60) setBorderColor("orange");
    else setBorderColor("red");
  };

  // Auto-calculate on input or checkbox change
  useEffect(() => {
    calculateMargin();
  }, [askingSalary, nightDiff, billRate, billableHours, conversionRate]);

  // useEffect(() => {
  //   if (selected) setFormData(selected);
  // }, [selected]);

  // Reset form
  const resetForm = () => {
    setAskingSalary("");
    setNightDiff(false);
    setBillRate("");
    setBillableHours("");
    setConversionRate("");
    setMargin("");
    setBorderColor("#000");
  };

  const downloadExcel = () => {
    if (filteredTrackers.length === 0) {
      alert("No data to download.");
      return;
    }

    const dlDate = new Date();
    const formattedDLDate = dlDate.toISOString().slice(2, 10).replace(/-/g, "");

    const worksheet = XLSX.utils.json_to_sheet(filteredTrackers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ApplicantsList");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    saveAs(blob, `ApplicantsList_${formattedDLDate}.xlsx`);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex text-slate-900">
      {/* Sidebar */}
      <SidebarIcons />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header
          userName={userName}
          userid={userid}
          onLogoutClick={() => setIsLogoutModalVisible(true)}
          pageTitle="Recruitment Tracker"
        />

        {/* Main Content */}
        <div className="flex flex-row flex-1">
          {/* Filters */}
          <div className="w-[270px] bg-white border-r px-5 py-6 flex flex-col gap-6">
            <h2 className="text-xs font-semibold text-slate-600 uppercase">
              Filters
            </h2>

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

            <div>
              <label className="text-[11px] uppercase text-slate-500 font-semibold block mb-1">
                Status
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {["All", ...uniqueStatuses].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 text-xs rounded-full transition ${
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
                <div className="absolute z-50 bg-white border border-slate-200 shadow-lg mt-2 rounded-xl">
                  <DateRange
                    ranges={dateRange}
                    onChange={(item) => setDateRange([item.selection])}
                    maxDate={new Date()}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] uppercase text-slate-500 font-semibold block mb-1">
                Position
              </label>
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="mt-1 w-full text-sm px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
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
              <label className="text-[11px] uppercase text-slate-500 font-semibold block mb-1">
                Application Source
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="mt-1 w-full text-sm px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
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
              <label className="text-[11px] uppercase text-slate-500 font-semibold block mb-1">
                Work Setup
              </label>
              <select
                value={setupFilter}
                onChange={(e) => setSetupFilter(e.target.value)}
                className="mt-1 w-full text-sm px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
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
              <label className="text-[11px] uppercase text-slate-500 font-semibold block mb-1">
                Recruiter
              </label>
              <select
                value={recruiterFilter}
                onChange={(e) => setRecruiterFilter(e.target.value)}
                className="mt-1 w-full text-sm px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
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
          {/* Table + Search */}
          <div className="flex-1 flex flex-col px-8 py-6">
            <div className="mb-4 flex items-end gap-2">
              {/* Search Input */}
              <div>
                <label className="text-[11px] uppercase text-slate-500 font-semibold block mb-1">
                  Search
                </label>
                <div className="relative w-[400px]">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Candidate name, position..."
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <img
                    src={searchIcon}
                    className="w-4 opacity-60 absolute left-3 top-1/2 -translate-y-1/2"
                    alt="Search"
                  />
                </div>
              </div>

              {/* Add New Candidate Button */}
              <button
                onClick={() => {
                  setFormData({}); // ⬅️ Reset form to blank state
                  setIsNewModalOpen(true);
                }}
                className="mt-[22px] px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm"
              >
                Add New Candidates
              </button>

              {/* GM Calculator Button */}
              <button
                onClick={() => setIsGMModalOpen(true)}
                className="mt-[22px] px-4 py-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm shadow-sm flex items-center gap-2"
                title="Open GM Calculator"
              >
                <HiCalculator className="text-lg" />
              </button>

              {/* Download Excel Button */}
              <button
                onClick={downloadExcel}
                className="mt-[22px] px-4 py-2.5 rounded-lg bg-green-200 hover:bg-green-300 text-green-900 text-sm shadow-sm flex items-center gap-2"
                title="Download Excel"
              >
                <HiDownload className="text-lg" />
              </button>
            </div>

            <div className="bg-white border rounded-xl shadow-sm overflow-y-auto overflow-x-hidden w-[1200px] max-h-[720px]">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-slate-100 sticky top-0 text-[11px] text-slate-600 uppercase tracking-wide">
                  <tr>
                    <th
                      style={{ width: "10%" }}
                      className="px-4 py-3 text-left"
                    >
                      Application Date
                    </th>
                    <th
                      style={{ width: "14%" }}
                      className="px-4 py-3 text-left"
                    >
                      Candidate Name
                    </th>
                    <th
                      style={{ width: "11%" }}
                      className="px-4 py-3 text-left"
                    >
                      Application Source
                    </th>
                    <th
                      style={{ width: "14%" }}
                      className="px-4 py-3 text-left"
                    >
                      Role Applied
                    </th>
                    <th style={{ width: "9%" }} className="px-4 py-3 text-left">
                      Work Setup
                    </th>
                    <th
                      style={{ width: "18%" }}
                      className="px-4 py-3 text-left"
                    >
                      Resume
                    </th>
                    <th
                      style={{ width: "10%" }}
                      className="px-4 py-3 text-left"
                    >
                      Overall Status
                    </th>
                    <th style={{ width: "7%" }} className="px-4 py-3 text-left">
                      Recruiter
                    </th>
                    <th style={{ width: "7%" }} className="px-4 py-3 text-left">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrackers.map((item, idx) => (
                    <tr
                      key={idx}
                      className={`cursor-pointer transition-colors ${
                        selected?.id === item.id
                          ? "bg-blue-50"
                          : "hover:bg-slate-50"
                      }`}
                      onClick={() => setSelected(item)}
                    >
                      <td className="px-4 py-3">
                        {formatDate(item.applicationdatetime)}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {displayValue(item.candidatename)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(item.candidatesource)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(item.applied_position_title)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(item.worksetup)}
                      </td>

                      <td className="px-4 py-3">
                        {item.candidatecvattachment ? (
                          <button
                            title={item.candidatecvattachment}
                            className={`text-left break-all focus:outline-none ${
                              viewedApplicants.includes(
                                String(item.applicationid),
                              )
                                ? "text-gray-500"
                                : "text-blue-600 hover:underline"
                            }`}
                            onClick={async (e) => {
                              e.stopPropagation();

                              try {
                                // 🟡 Open blank tab first to prevent browser popup block
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

                                const isWordDoc =
                                  data.url.endsWith(".doc") ||
                                  data.url.endsWith(".docx");

                                const viewerUrl = isWordDoc
                                  ? `https://docs.google.com/gview?url=${encodeURIComponent(
                                      data.url,
                                    )}&embedded=true`
                                  : data.url;

                                // ✅ Mark as viewed
                                markApplicantAsViewed(item.applicationid);

                                // ✅ Navigate tab to resume
                                if (newTab) {
                                  newTab.location.href = viewerUrl;
                                } else {
                                  // fallback
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

                      <td className="px-4 py-3">
                        {displayValue(item.overall_status)}
                      </td>

                      <td className="px-4 py-3">
                        {displayValue(item.recruiter)}
                      </td>

                      <td className="px-4 py-3">
                        {displayValue(item.remarks) !== "—"
                          ? `${item.remarks.slice(0, 50)}...`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="w-[350px] shrink-0 border-l border-slate-200 bg-white flex flex-col h-[calc(100vh-56px)]">
            {selected ? (
              <>
                {/* ===== HEADER (Fixed) ===== */}
                {(() => {
                  const preview = formData?.applicationid ? formData : selected;

                  return (
                    <div className="p-6 pb-4 border-b border-slate-100">
                      <h3 className="text-lg font-semibold truncate">
                        {displayValue(preview?.candidatename)}
                      </h3>

                      <div className="text-xs uppercase text-slate-500 font-bold mt-1 truncate">
                        {displayValue(preview?.applied_position_title)}
                      </div>

                      <div className="flex gap-6 mt-4">
                        <Info
                          label="Status"
                          value={displayValue(preview?.overall_status)}
                        />
                        <Info
                          label="Recruiter"
                          value={displayValue(preview?.recruiter)}
                        />
                      </div>

                      <div className="flex gap-6 mt-4">
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

                {/* ===== TABS + DETAILS (Scrollable) ===== */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-6 pt-4">
                  <p className="text-[11px] uppercase text-slate-500 font-semibold mb-2">
                    Details
                  </p>

                  {/* Tab Buttons */}
                  <div className="border-b border-slate-200 mb-2 flex gap-6 overflow-x-auto">
                    {Object.keys(categories).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setSelectedTab(tab)}
                        className={`text-sm pb-2 transition font-medium whitespace-nowrap ${
                          selectedTab === tab
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-slate-500 hover:text-blue-600"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Scrollable Content Area */}
                  <div className="flex-1 overflow-y-auto pr-1 mb-4">
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

                {/* ===== FOOTER (Fixed) ===== */}
                <div className="p-6 mb-10 border-t border-slate-200">
                  <div className="flex gap-4">
                    <button
                      onClick={async () => {
                        try {
                          const res = await axios.get(
                            `${SERVER_URL}/applicants/getcandidate/${selected.applicationid}`,
                            { withCredentials: true },
                          );

                          const rawData = res.data;
                          const normalized = normalizeFormData(rawData);

                          setSelected(rawData); // ✅ Keep Preview in sync (snake_case)
                          setFormData(normalized); // ✅ Form uses camelCase
                          setIsEditModalOpen(true); // ✅ Open after setting form
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
                      className="w-fit px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm"
                    >
                      Edit Candidate Info
                    </button>

                    <button
                      className="w-fit px-4 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-700 text-white text-sm shadow-sm"
                      onClick={async () => {
                        const freshRes = await axios.get(
                          `${SERVER_URL}/applicants/getcandidate/${selected.applicationid}`,
                          { withCredentials: true },
                        );

                        const rawData = freshRes.data;
                        const normalized = normalizeFormData(rawData);

                        setSelected(rawData); // ✅ snake_case for Preview Panel
                        setFormData(normalized); // ✅ camelCase for Modal
                        setIsUpdateCycleModalOpen(true); // ✅ Open modal
                      }}
                    >
                      Update Lifecycles
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm px-4">
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
            markApplicantAsViewed={markApplicantAsViewed} // ✅ Add this line
          />

          <UpdateCandidateLifecycleModal
            isOpen={isUpdateCycleModalOpen}
            onClose={() => {
              setIsUpdateCycleModalOpen(false);
              setFormData({}); // 👈 Reset formData so preview uses `selected`
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
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="w-full max-w-xl bg-white rounded-xl shadow-xl p-6 relative">
                {/* Header */}
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    GM Calculator
                  </h2>
                  {/* <button
                    onClick={() => setIsGMModalOpen(false)}
                    className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
                  >
                    &times;
                  </button> */}
                </div>

                {/* Form */}
                <div className="space-y-4">
                  {/* Asking Salary */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Asking Salary (₱)
                    </label>
                    <input
                      type="number"
                      value={askingSalary}
                      onChange={(e) => setAskingSalary(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter asking salary"
                    />
                  </div>

                  {/* Night Diff */}
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

                  {/* Bill Rate */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Bill Rate per Hour ($)
                    </label>
                    <input
                      type="number"
                      value={billRate}
                      onChange={(e) => setBillRate(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter bill rate"
                    />
                  </div>

                  {/* Billable Hours */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Billable Hours / Day
                    </label>
                    <input
                      type="number"
                      value={billableHours}
                      onChange={(e) => setBillableHours(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter billable hours"
                    />
                  </div>

                  {/* Conversion Rate */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Conversion Rate (₱)
                    </label>
                    <input
                      type="number"
                      value={conversionRate}
                      onChange={(e) => setConversionRate(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter conversion rate"
                    />
                  </div>

                  {/* Margin Display */}
                  <div className="mt-4">
                    <label className="block text-sm font-semibold mb-2">
                      Margin (%)
                    </label>
                    <div
                      className="w-full text-center text-2xl font-bold py-4 rounded-lg border-4"
                      style={{ borderColor }}
                    >
                      {margin ? `${margin}%` : "—"}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGMModalOpen(false)}
                    className="px-4 py-2 text-sm rounded-md border text-slate-600 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {statusModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-xl shadow-xl p-10 w-[340px] text-center relative animate-fade-in-up">
                <button
                  onClick={() =>
                    setStatusModal({ isOpen: false, type: "", message: "" })
                  }
                  className="absolute top-3 right-4 text-slate-400 hover:text-red-500 text-lg"
                >
                  &times;
                </button>

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

                <h3 className="text-lg font-semibold mb-2">
                  {statusModal.type === "success" ? "Success" : "Error"}
                </h3>

                <p className="text-sm text-slate-600">{statusModal.message}</p>
              </div>
            </div>
          )}
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
}

const Info = ({ label, value }) => (
  <div>
    <p className="text-[11px] uppercase text-slate-500 font-semibold mb-1">
      {label}
    </p>
    <p className="text-sm text-slate-800 break-words">{value}</p>
  </div>
);

// ✅ Correct export using React.memo
export default RecruitmentTracker;
