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

// Helper
const formatDate = (iso) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "—" : format(date, "MMM dd, yyyy");
};

function RecruitmentTracker() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("name") || "User";
  const userid = localStorage.getItem("userid") || "";
  const [trackers, setTrackers] = useState([]);
  const [filteredTrackers, setFilteredTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  //   const [userid, setUserId] = useState("");
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

  //localStorage to store viewed applicant IDs
  const [viewedApplicants, setViewedApplicants] = useState(() => {
    const saved = localStorage.getItem("viewedApplicants");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Define at component scope (before useEffect)
  const fetchData = async () => {
    try {
      setLoading(true); // Start loading

      const response = await fetch(`${SERVER_URL}/api/recruitment_tracker`);
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      setTrackers(data || []);
      setFilteredTrackers(data || []);
      setError(null); // Clear previous error
      console.log(
        `📊 Recruitment Tracker fetched ${
          Array.isArray(data) ? data.length : 0
        } rows`
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
        v?.toString().toLowerCase().includes(q)
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
    Boolean
  );

  const uniqueRecruiters = [
    ...new Set(trackers.map((t) => t.recruiter)),
  ].filter(Boolean);

  const formatRangeLabel = () => {
    const { startDate, endDate } = dateRange[0];
    if (!startDate || !endDate) return "Select Date Range";
    return `${format(startDate, "MMM dd, yyyy")} - ${format(
      endDate,
      "MMM dd, yyyy"
    )}`;
  };

  //Account Dropdown
  const [accountOptions, setAccountOptions] = useState([]);
  const [lobOptions, setLobOptions] = useState([]);
  const [taskOptions, setTaskOptions] = useState([]);

  const fetchAccountList = async () => {
    try {
      // console.log("Calling API to fetch account list...");
      const response = await fetch(`${SERVER_URL}/api/accountList`);

      if (!response.ok) {
        console.error(
          "Failed to fetch account list:",
          response.status,
          response.statusText
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
        (a, b) => a.ACCOUNT.toLowerCase().localeCompare(b.ACCOUNT.toLowerCase())
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
      const response = await fetch(
        `${SERVER_URL}/api/lobList?account=${encodeURIComponent(
          account.toLowerCase()
        )}`
      );

      if (!response.ok) {
        console.error(
          "Failed to fetch LOB list:",
          response.status,
          response.statusText
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
      const response = await fetch(
        `${SERVER_URL}/api/taskList?account=${encodeURIComponent(
          account.toLowerCase()
        )}&lob=${encodeURIComponent(lob.toLowerCase())}` // Normalize to lowercase
      );

      if (!response.ok) {
        console.error(
          "Failed to fetch Task list:",
          response.status,
          response.statusText
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
      const response = await fetch(
        `${SERVER_URL}/api/accountCode?account=${encodeURIComponent(
          account.toLowerCase()
        )}&lob=${encodeURIComponent(
          lob.toLowerCase()
        )}&task=${encodeURIComponent(task.toLowerCase())}` // Normalize to lowercase
      );

      if (!response.ok) {
        console.error(
          "Failed to fetch ACCOUNTCODE:",
          response.status,
          response.statusText
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
      const response = await axios.get(`${SERVER_URL}/api/RecruitersList`);

      // Extract the nested array
      const nestedRecruiters = response.data[0];

      // Remove duplicates (if necessary)
      const uniqueRecruiters = Array.from(
        new Set(nestedRecruiters.map((recruiter) => recruiter.NAME))
      ).map((name) => {
        return nestedRecruiters.find((recruiter) => recruiter.NAME === name);
      });

      setRecruiters(uniqueRecruiters); // Set the unique recruiters array
    } catch (error) {
      console.error("Error fetching recruiters:", error);
    }
  };

  const sanitizeFormData = (data) => {
    const sanitized = {};
    Object.keys(data || {}).forEach((key) => {
      sanitized[key] = data[key] ?? ""; // convert null/undefined → ""
    });
    return sanitized;
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

  // const handleAccountChange = (e) => {
  //   setFormData((prev) => ({
  //     ...prev,
  //     profiledForAccount: e.target.value,
  //     lob: "",
  //     task: "",
  //   }));
  // };

  // const handleLobChange = (e) => {
  //   setFormData((prev) => ({
  //     ...prev,
  //     lob: e.target.value,
  //     task: "",
  //   }));
  // };

  // const handleTaskChange = (e) => {
  //   setFormData((prev) => ({
  //     ...prev,
  //     task: e.target.value,
  //   }));
  // };

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
        formData.profiledForAccount || "N/A"
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
        normalizeDate(formData.initialInterviewDate)
      );
      formDataToSend.append(
        "initialInterviewStatus",
        formData.initialInterviewStatus || ""
      );

      formDataToSend.append(
        "skillsAssessmentDate",
        normalizeDate(formData.skillsAssessmentDate)
      );
      formDataToSend.append(
        "skillsAssessmentStatus",
        formData.skillsAssessmentStatus || ""
      );

      formDataToSend.append(
        "clientInterviewDate",
        normalizeDate(formData.clientInterviewDate)
      );
      formDataToSend.append(
        "clientInterviewStatus",
        formData.clientInterviewStatus || ""
      );

      formDataToSend.append(
        "finalInterviewDate",
        normalizeDate(formData.finalInterviewDate)
      );
      formDataToSend.append(
        "finalInterviewStatus",
        formData.finalInterviewStatus || ""
      );

      formDataToSend.append(
        "jobOfferDate",
        normalizeDate(formData.jobOfferDate)
      );
      formDataToSend.append("jobOfferStatus", formData.jobOfferStatus || "");

      formDataToSend.append(
        "onboardingDate",
        normalizeDate(formData.onboardingDate)
      );
      formDataToSend.append(
        "onboardingStatus",
        formData.onboardingStatus || ""
      );

      formDataToSend.append(
        "endorsementDateTime",
        normalizeDate(formData.endorsementDateTime)
      );
      formDataToSend.append(
        "endorsementStatus",
        formData.endorsementStatus || ""
      );

      formDataToSend.append(
        "dateUpdated",
        new Date().toISOString().split("T")[0]
      );
      formDataToSend.append("overallStatus", formData.overallStatus || "");
      formDataToSend.append("fallout", formData.fallout || "");
      formDataToSend.append(
        "falloutDate",
        normalizeDate(formData.falloutDateTime)
      ); // ❗ correct backend field
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
          formData.candidatecvattachment
        );
      }

      let accountCode = null;

      // Fetch the ACCOUNTCODE only if the department is "Operations"
      if (formData.department === "Operations") {
        accountCode = await fetchAccountCode(
          formData.profiledForAccount,
          formData.lob,
          formData.task
        );

        if (!accountCode) {
          alert("Failed to fetch ACCOUNTCODE. Please verify your selections.");
          setIsSaving(false);
          return;
        }
      }

      const response = await axios.put(
        `${SERVER_URL}/updateApplicant`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        showToast("success", "Lifecycle updated successfully.");
        setIsUpdateCycleModalOpen(false);
        fetchData(); // Refresh list
      } else {
        showToast("error", "Update failed.");
      }
    } catch (error) {
      console.error("Update error:", error);
      showToast("error", "Server error during update.");
    } finally {
      setIsSaving(false);
    }
  };

  // const accountOptions = [
  //   { ACCOUNT: "Account A" },
  //   { ACCOUNT: "Account B" },
  //   { ACCOUNT: "Account C" },
  // ];

  // const lobOptions = ["LOB 1", "LOB 2", "LOB 3"];

  // const taskOptions = ["Task 1", "Task 2", "Task 3"];

  // const recruiters = [
  //   { NAME: "Recruiter 1" },
  //   { NAME: "Recruiter 2" },
  //   { NAME: "Recruiter 3" },
  // ];

  useEffect(() => {
    if (!formData.voiceUrl && formData.applicationId) {
      const fetchVoiceUrl = async () => {
        try {
          const res = await fetch(
            `${SERVER_URL}/api/voice-recording/${formData.applicationId}`
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
          : { ...prev, applicationSource: "QuickApp - Referral" }
      );
    } else if (src === "QuickApp - Referral" && !hasRef) {
      setFormData((prev) =>
        prev.applicationSource === "QuickApp"
          ? prev
          : { ...prev, applicationSource: "QuickApp" }
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

  // helper to update localStorage when a CV is viewed
  const markApplicantAsViewed = (applicationId) => {
    setViewedApplicants((prev) => {
      const updated = new Set(prev);
      updated.add(applicationId);
      localStorage.setItem(
        "viewedApplicants",
        JSON.stringify(Array.from(updated))
      );
      return updated;
    });
  };

  //Load from localStorage the saved viewedApplicants
  useEffect(() => {
    const saved = localStorage.getItem("viewedApplicants");
    if (saved) {
      setViewedApplicants(new Set(JSON.parse(saved)));
    }
  }, []);

  const sendVoiceRecordingEmail = async () => {
    if (!formData.candidateemail1 || !formData.applicationid) {
      alert("Email and Applicant ID are required.");
      return;
    }

    setIsSendingVoice(true);
    try {
      const response = await axios.post(`${SERVER_URL}/voiceRecordingEmail`, {
        emailAddress: formData.candidateemail1,
        applicantID: formData.applicationid,
      });

      if (response.data.success) {
        alert("Voice recording email sent successfully.");
      } else {
        alert("Failed to send voice recording email.");
      }
    } catch (error) {
      console.error("Error sending voice recording email:", error);
      alert(
        "An error occurred while sending the voice recording instructions."
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
      const response = await axios.post(`${SERVER_URL}/typingTestEmail`, {
        emailAddress: formData.candidateemail1,
        applicantID: formData.applicationid,
      });

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
      const response = await axios.post(`${SERVER_URL}/eolEmail`, {
        emailAddress: formData.candidateemail1,
        applicantID: formData.applicationid,
      });

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

  const renderFieldValue = (field, value) => {
    if (!value) return "—";

    if (field.includes("date")) {
      return formatDate(value);
    }

    if (field === "candidatecvattachment") {
      return (
        <a
          href={`${SERVER_URL}/api/resume/${value}`}
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
        `${SERVER_URL}/editApplicant`,
        formDataToSend,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.success) {
        // ✅ Send acknowledgment email only if resume was uploaded
        if (resumeUploaded && formData.candidateemail1) {
          await sendAcknowledgmentEmail();
        }

        showToast("success", "Candidate updated successfully.");
        setIsEditModalOpen(false);
        fetchData();
      } else {
        showToast("error", "Update failed.");
      }
    } catch (error) {
      console.error("❌ Edit failed:", error);
      showToast(
        "error",
        error?.response?.data?.message || "Error updating candidate."
      );
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
        `${SERVER_URL}/api/checkEmailExists`,
        {
          email1: formData.candidateemail1,
          email2: formData.candidateemail2,
        }
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

      // 🔥 IMPORTANT: append candidatename explicitly
      formDataWithAttachment.append("candidatename", candidatename);

      /* ======================================================
       ✅ SUBMIT TO BACKEND
    ====================================================== */
      const response = await axios.post(
        `${SERVER_URL}/addApplicants`,
        formDataWithAttachment,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        // ✅ Send acknowledgment email only if resume exists
        if (resumeUploaded && formData.candidateemail1) {
          await sendAcknowledgmentEmail();
        }

        // alert("Candidate added successfully.");
        showToast("success", "Candidate added successfully.");

        setIsNewModalOpen(false);
        fetchData();
        setFormData(INITIAL_FORM_DATA);
      } else {
        showToast("error", "Error submitting record. Please try again.");
      }
    } catch (error) {
      console.error("❌ Submit failed:", error);

      showToast(
        "error",
        error?.response?.data?.sqlMessage ||
          error?.response?.data?.message ||
          "Unknown server error"
      );
    } finally {
      setIsSaving(false);
      setFormData(INITIAL_FORM_DATA);
    }
  };

  const sendAcknowledgmentEmail = async () => {
    try {
      await axios.post(`${SERVER_URL}/api/send_acknowledgment`, {
        email: formData.candidateemail1,
      });
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
          onLogoutClick={() => localStorage.clear() || navigate("/OauthLogin")}
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
                    prev === "newest" ? "oldest" : "newest"
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
                onClick={() => setIsNewModalOpen(true)}
                className="mt-[22px] px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm"
              >
                Add New Candidate
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

            <div className="bg-white border rounded-xl shadow-sm overflow-auto max-h-[520px]">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 sticky top-0 text-[11px] text-slate-600 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Application Date</th>
                    <th className="px-4 py-3 text-left">Candidate Name</th>
                    <th className="px-4 py-3 text-left">Application Source</th>
                    <th className="px-4 py-3 text-left">Role Applied</th>
                    <th className="px-4 py-3 text-left">Work Setup</th>
                    <th className="px-4 py-3 text-left">Resume</th>
                    <th className="px-4 py-3 text-left">Overall Status</th>
                    <th className="px-4 py-3 text-left">Recruiter</th>
                    <th className="px-4 py-3 text-left">Remarks</th>
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
                        {item.candidatename || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {item.candidatesource || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {item.applied_position_title || "—"}
                      </td>
                      <td className="px-4 py-3">{item.worksetup || "—"}</td>
                      <td className="px-4 py-3">
                        {item.candidatecvattachment ? (
                          <button
                            title={item.candidatecvattachment}
                            className="text-blue-600 hover:underline text-left break-all focus:outline-none"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const res = await fetch(
                                  `${SERVER_URL}/api/resume/${item.candidatecvattachment}`
                                );
                                const data = await res.json();

                                if (data?.url) {
                                  const isWordDoc =
                                    data.url.endsWith(".doc") ||
                                    data.url.endsWith(".docx");

                                  const viewerUrl = isWordDoc
                                    ? `https://docs.google.com/gview?url=${encodeURIComponent(
                                        data.url
                                      )}&embedded=true`
                                    : data.url;

                                  window.open(
                                    viewerUrl,
                                    "_blank",
                                    "noopener,noreferrer"
                                  );
                                } else {
                                  alert("Resume URL not available.");
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
                        {item.overall_status || "—"}
                      </td>
                      <td className="px-4 py-3">{item.recruiter || "—"}</td>
                      <td className="px-4 py-3">
                        {item.remarks ? item.remarks.slice(0, 50) + "..." : "—"}
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
                <div className="p-6 pb-4 border-b border-slate-100">
                  <h3 className="text-lg font-semibold truncate">
                    {selected.candidatename || "—"}
                  </h3>
                  <div className="text-xs uppercase text-slate-500 font-bold mt-1 truncate">
                    {selected.applied_position_title || "—"}
                  </div>
                  <div className="flex gap-6 mt-4">
                    <Info label="Status" value={selected.overall_status} />
                    <Info label="Recruiter" value={selected.recruiter} />
                  </div>
                  <div className="flex gap-6 mt-4">
                    <Info
                      label="Applied On"
                      value={formatDate(selected.applicationdatetime)}
                    />
                    <Info label="Work Setup" value={selected.worksetup} />
                  </div>
                </div>

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
                      {categories[selectedTab]
                        ?.filter((field) => field !== "candidatecvattachment") // ❌ Exclude resume field
                        .map((field) => (
                          <Info
                            key={field}
                            label={getFieldLabel(field)}
                            value={renderFieldValue(field, selected[field])}
                          />
                        ))}
                    </div>
                  </div>
                </div>

                {/* ===== FOOTER (Fixed) ===== */}
                <div className="p-6 mb-10 border-t border-slate-200">
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        if (selected) {
                          setFormData(selected); // Set the data for editing
                          setIsEditModalOpen(true); // Open modal
                        }
                      }}
                      className="w-fit px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm"
                    >
                      Edit Candidate Info
                    </button>

                    <button
                      className="w-fit px-4 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-700 text-white text-sm shadow-sm"
                      onClick={() => {
                        if (selected) {
                          setFormData(selected); // Prefill modal with selected tracker data
                          setIsUpdateCycleModalOpen(true);
                        }
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

          {isNewModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-6">
              <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl p-6 relative">
                {/* === Modal Header === */}
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      New Candidate Application
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsNewModalOpen(false)}
                    className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
                  >
                    &times;
                  </button>
                </div>

                {/* === Form === */}
                <form
                  id="newCandidateForm"
                  onSubmit={handleSubmit}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm"
                >
                  {/* Application Source */}
                  <div>
                    <label className="block font-medium mb-1">
                      Application Source <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="candidatesource"
                      value={formData.candidatesource}
                      onChange={handleChange}
                      className="w-full border rounded h-10 px-3"
                      required
                    >
                      <option value="">Select</option>
                      <option value="CMXPH Site">CMXPH Site</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Indeed">Indeed</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Internal Job Posting">
                        Internal Job Posting
                      </option>
                      <option value="Jobstreet">Jobstreet</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Referral">Referral</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Walk In">Walk In</option>
                      <option value="QuickApp">QuickApp</option>
                      <option value="QuickApp - Referral">
                        QuickApp - Referral
                      </option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Referral Code */}
                  {showReferralField && (
                    <div>
                      <label className="block font-medium mb-1">
                        Referral Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="referral_code"
                        value={formData.referral_code || ""}
                        onChange={handleChange}
                        className="w-full border rounded h-10 px-3"
                        required={(formData.applicationSource || "")
                          .toLowerCase()
                          .includes("referral")}
                      />
                    </div>
                  )}

                  {/* Applicant Type */}
                  <div>
                    <label className="block font-medium mb-1">
                      Applicant Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="candidatetype"
                      value={formData.candidatetype}
                      onChange={handleChange}
                      className="w-full border rounded h-10 px-3"
                      required
                    >
                      <option value="">Select</option>
                      <option value="External-New">External-New</option>
                      <option value="External-Re Application">
                        External-Re Application
                      </option>
                      <option value="Internal">Internal</option>
                    </select>
                  </div>

                  {/* Role Applied */}
                  <div>
                    <label className="block font-medium mb-1">
                      Role Applied <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="applied_role"
                      value={formData.applied_role}
                      onChange={handleChange}
                      className="w-full border rounded h-10 px-3"
                      required
                    >
                      <option value="">Select</option>
                      <option value="Staff 1">Staff 1</option>
                      <option value="Staff 2 - Specialized Roles">
                        Staff 2 - Specialized Roles
                      </option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Sr. Supervisor">Sr. Supervisor</option>
                      <option value="Manager">Manager</option>
                      <option value="Sr. Manager">Sr. Manager</option>
                      <option value="Director">Director</option>
                      <option value="Sr. Director">Sr. Director</option>
                    </select>
                  </div>

                  {/* Position Title */}
                  <div>
                    <label className="block font-medium mb-1">
                      Position Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="applied_position_title"
                      value={formData.applied_position_title}
                      onChange={handleChange}
                      className="w-full border rounded h-10 px-3"
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
                      className="w-full border rounded h-10 px-3"
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

                  {/* Name Fields */}
                  <div>
                    <label className="block font-medium mb-1">Title</label>
                    <select
                      name="nameTitle"
                      value={formData.nameTitle}
                      onChange={handleChange}
                      className="w-full border rounded h-10 px-3"
                    >
                      <option value="">Select</option>
                      <option value="N/A">N/A</option>
                      <option value="MD">MD</option>
                      <option value="DMD">DMD</option>
                      <option value="RN">RN</option>
                      <option value="Atty">Atty.</option>
                      <option value="Engr">Engr.</option>
                      <option value="Arch">Arch.</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-1">
                      Name Suffix
                    </label>
                    <select
                      name="nameSuffix"
                      value={formData.nameSuffix}
                      onChange={handleChange}
                      className="w-full border rounded h-10 px-3"
                    >
                      <option value="">Select</option>
                      <option value="N/A">N/A</option>
                      <option value="Jr">Jr</option>
                      <option value="Sr">Sr</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                      <option value="V">V</option>
                      <option value="VI">VI</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full border rounded h-10 px-3"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full border rounded h-10 px-3"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleChange}
                      className="w-full border rounded h-10 px-3"
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full border rounded h-10 px-3"
                      required
                    >
                      <option value="">Select</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>

                  {/* Contact Info */}
                  <div>
                    <label className="block font-medium mb-1">
                      Phone 1 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="candidatephone1"
                      value={formData.candidatephone1}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value) && value.length <= 11) {
                          handleChange(e);
                        }
                      }}
                      className="w-full border rounded h-10 px-3"
                      maxLength="11"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Phone 2</label>
                    <input
                      type="text"
                      name="candidatephone2"
                      value={formData.candidatephone2}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value) && value.length <= 11) {
                          handleChange(e);
                        }
                      }}
                      className="w-full border rounded h-10 px-3"
                      maxLength="11"
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">
                      Email 1 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="candidateemail1"
                      value={formData.candidateemail1}
                      onChange={handleChange}
                      className="w-full border rounded h-10 px-3"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Email 2</label>
                    <input
                      type="email"
                      name="candidateemail2"
                      value={formData.candidateemail2}
                      onChange={handleChange}
                      className="w-full border rounded h-10 px-3"
                    />
                  </div>

                  {/* Resume Upload */}
                  <div>
                    <label className="block font-medium mb-1">
                      Resume Attachment
                    </label>
                    <input
                      type="file"
                      name="resume"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="w-full border rounded h-10 px-3 pt-[6px]"
                    />
                  </div>
                </form>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="newCandidateForm"
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isEditModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-6">
              <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl p-6 relative">
                {/* === Modal Header === */}
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      Edit Candidate Information
                    </h2>
                    <p className="text-sm text-gray-500">
                      {formData.candidatename} ·{" "}
                      {formData.applied_position_title}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
                  >
                    &times;
                  </button>
                </div>

                {/* === Modal Body === */}
                <form
                  onSubmit={handleEdit}
                  encType="multipart/form-data"
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Application ID (readonly) */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Application ID
                      </label>
                      <input
                        type="text"
                        name="applicationid"
                        value={formData.applicationid || ""}
                        readOnly
                        className="w-full border rounded h-10 px-3 bg-slate-100"
                      />
                    </div>

                    {/* Application Source */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Application Source
                      </label>
                      <select
                        name="candidatesource"
                        value={formData.candidatesource || ""}
                        onChange={handleChange}
                        className="w-full border rounded h-10 px-3"
                        required
                      >
                        <option value="">Select</option>
                        <option value="CMXPH Site">CMXPH Site</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Indeed">Indeed</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Internal Job Posting">
                          Internal Job Posting
                        </option>
                        <option value="Jobstreet">Jobstreet</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Referral">Referral</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Walk In">Walk In</option>
                        <option value="QuickApp">QuickApp</option>
                        <option value="QuickApp - Referral">
                          QuickApp - Referral
                        </option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Referral Code */}
                    {showReferralField && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Referral Code
                        </label>
                        <input
                          type="text"
                          name="referral_code"
                          value={formData.referral_code || ""}
                          onChange={handleChange}
                          className="w-full border rounded h-10 px-3"
                        />
                      </div>
                    )}

                    {/* Applicant Type */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Applicant Type
                      </label>
                      <select
                        name="candidatetype"
                        value={formData.candidatetype || ""}
                        onChange={handleChange}
                        className="w-full border rounded h-10 px-3"
                        required
                      >
                        <option value="">Select</option>
                        <option value="External-New">External-New</option>
                        <option value="External-Re Application">
                          External-Re Application
                        </option>
                        <option value="Internal">Internal</option>
                      </select>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        name="candidatename"
                        value={formData.candidatename || ""}
                        onChange={handleChange}
                        className="w-full border rounded h-10 px-3"
                        required
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={formData.gender || ""}
                        onChange={handleChange}
                        className="w-full border rounded h-10 px-3"
                        required
                      >
                        <option value="">Select</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                      </select>
                    </div>

                    {/* Role Applied */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Role Applied
                      </label>
                      <select
                        name="applied_role"
                        value={formData.applied_role || ""}
                        onChange={handleChange}
                        className="w-full border rounded h-10 px-3"
                        required
                      >
                        <option value="">Select</option>
                        <option value="Staff 1">Staff 1</option>
                        <option value="Staff 2 - Specialized Roles">
                          Staff 2 - Specialized Roles
                        </option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Sr. Supervisor">Sr. Supervisor</option>
                        <option value="Manager">Manager</option>
                        <option value="Sr. Manager">Sr. Manager</option>
                        <option value="Director">Director</option>
                        <option value="Sr. Director">Sr. Director</option>
                      </select>
                    </div>

                    {/* Position Title */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Position Title
                      </label>
                      <input
                        type="text"
                        name="applied_position_title"
                        value={formData.applied_position_title || ""}
                        onChange={handleChange}
                        className="w-full border rounded h-10 px-3"
                        required
                      />
                    </div>

                    {/* Phone 1 */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Phone 1
                      </label>
                      <input
                        type="text"
                        name="candidatephone1"
                        value={formData.candidatephone1 || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d*$/.test(value) && value.length <= 11) {
                            handleChange(e);
                          }
                        }}
                        maxLength="11"
                        className="w-full border rounded h-10 px-3"
                        required
                      />
                    </div>

                    {/* Phone 2 */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Phone 2
                      </label>
                      <input
                        type="text"
                        name="candidatephone2"
                        value={formData.candidatephone2 || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d*$/.test(value) && value.length <= 11) {
                            handleChange(e);
                          }
                        }}
                        maxLength="11"
                        className="w-full border rounded h-10 px-3"
                      />
                    </div>

                    {/* Email 1 */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Email 1
                      </label>
                      <input
                        type="email"
                        name="candidateemail1"
                        value={formData.candidateemail1 || ""}
                        onChange={handleChange}
                        className="w-full border rounded h-10 px-3"
                        required
                      />
                    </div>

                    {/* Email 2 */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Email 2
                      </label>
                      <input
                        type="email"
                        name="candidateemail2"
                        value={formData.candidateemail2 || ""}
                        onChange={handleChange}
                        className="w-full border rounded h-10 px-3"
                      />
                    </div>

                    {/* Resume Upload */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Upload Resume
                      </label>
                      <input
                        type="file"
                        name="resume"
                        onChange={handleFileChange}
                        className="w-full border rounded h-10 px-3 pt-[6px]"
                      />
                    </div>
                  </div>

                  {/* Uploaded Resume Preview */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Uploaded Resume
                    </label>
                    {formData.candidatecvattachment ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await axios.get(
                              `${SERVER_URL}/api/resume/${formData.candidatecvattachment}`
                            );
                            window.open(
                              res.data.url,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          } catch {
                            alert("Unable to load resume.");
                          }
                        }}
                        className="text-blue-600 underline text-sm"
                      >
                        {formData.candidatecvattachment}
                      </button>
                    ) : (
                      <p className="text-sm text-red-500">No file uploaded</p>
                    )}
                  </div>

                  {/* Footer Buttons */}
                  <div className="flex justify-end items-center gap-3 pt-6 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 text-sm rounded-md border text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isUpdateCycleModalOpen && selected && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-6">
              <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl p-6 relative">
                {/* Header */}
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      Update Candidate Lifecycle
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selected.candidatename} ·{" "}
                      {selected.applied_position_title}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsUpdateCycleModalOpen(false)}
                    className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleUpdateLifecycle} className="space-y-6">
                  {/* === Basic Details === */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ReadOnlyInput
                      label="Application ID"
                      value={formData.applicationid}
                    />

                    <ReadOnlyInput
                      label="Name"
                      value={formData.candidatename}
                    />

                    <ReadOnlyInput label="Gender" value={formData.gender} />
                    <ReadOnlyInput
                      label="Role Applied"
                      value={formData.applied_role}
                    />

                    <ReadOnlyInput
                      label="Position Title"
                      value={formData.applied_position_title}
                    />
                    <SelectInput
                      label="Department "
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      options={[
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
                      ]}
                      required
                    />

                    <SelectInput
                      label="Role Profiled "
                      name="roleProfiled"
                      value={formData.roleProfiled}
                      onChange={handleChange}
                      options={[
                        "Staff 1",
                        "Staff 2 - Specialized Roles",
                        "Supervisor",
                        "Sr. Supervisor",
                        "Manager",
                        "Sr. Manager",
                        "Director",
                        "Sr. Director",
                      ]}
                      required
                    />

                    <SelectInput
                      label="Profiled for Account "
                      name="profiledForAccount"
                      value={formData.profiledForAccount}
                      onChange={handleAccountChange}
                      options={
                        formData.department === "Operations"
                          ? accountOptions.map((a) => a.ACCOUNT)
                          : ["N/A"]
                      }
                      disabled={formData.department !== "Operations"}
                      required
                    />

                    <SelectInput
                      label="Line of Business "
                      name="lob"
                      value={formData.lob}
                      onChange={handleLobChange}
                      options={
                        formData.department === "Operations"
                          ? lobOptions
                          : ["N/A"]
                      }
                      disabled={
                        formData.department !== "Operations" ||
                        !formData.profiledForAccount
                      }
                      required
                    />

                    <SelectInput
                      label="Task "
                      name="task"
                      value={formData.task}
                      onChange={handleTaskChange}
                      options={
                        formData.department === "Operations"
                          ? taskOptions
                          : ["N/A"]
                      }
                      disabled={!formData.lob}
                      required
                    />

                    <SelectInput
                      label="Recruiter "
                      name="recruiter"
                      value={formData.recruiter}
                      onChange={handleRecruiterChange}
                      options={recruiters.map((r) => r.NAME)}
                      required
                    />

                    <SelectInput
                      label="Work Setup "
                      name="workSetup"
                      value={formData.workSetup}
                      onChange={handleChange}
                      options={["On Site", "Work from Home", "Hybrid"]}
                      required
                    />
                  </div>

                  {/* === Resume Display === */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Uploaded Resume
                    </label>
                    {formData.candidatecvattachment ? (
                      <button
                        type="button"
                        className="text-blue-600 underline text-sm"
                        onClick={async () => {
                          try {
                            const res = await axios.get(
                              `${SERVER_URL}/api/resume/${formData.candidatecvattachment}`
                            );
                            window.open(
                              res.data.url,
                              "_blank",
                              "noopener,noreferrer"
                            );
                            markApplicantAsViewed(formData.applicationId);
                          } catch {
                            alert("Unable to load resume.");
                          }
                        }}
                      >
                        {formData.candidatecvattachment}
                      </button>
                    ) : (
                      <p className="text-sm text-red-500">No file uploaded</p>
                    )}
                  </div>

                  {/* === Lifecycle Stages === */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Stage: Initial Interview */}
                    <StageBlock
                      stage="Initial Interview"
                      statusField="initialInterviewStatus"
                      dateField="initialInterviewDate"
                      formData={formData}
                      handleChange={handleChange}
                      handleDateChange={handleDateChange}
                      isDisabled={
                        formData.overallStatus !== "Active Application"
                      }
                    />

                    {/* Stage: Skills Assessment */}
                    <StageBlock
                      stage="Skills Assessment"
                      statusField="skillsAssessmentStatus"
                      dateField="skillsAssessmentDate"
                      formData={formData}
                      handleChange={handleChange}
                      handleDateChange={handleDateChange}
                      isDisabled={
                        !["Passed", "N/A"].includes(
                          formData.initialInterviewStatus
                        ) || formData.overallStatus !== "Active Application"
                      }
                    />

                    {/* Stage: Client Interview */}
                    <StageBlock
                      stage="Client Interview"
                      statusField="clientInterviewStatus"
                      dateField="clientInterviewDate"
                      formData={formData}
                      handleChange={handleChange}
                      handleDateChange={handleDateChange}
                      isDisabled={
                        !["Passed", "N/A"].includes(
                          formData.skillsAssessmentStatus
                        ) || formData.overallStatus !== "Active Application"
                      }
                    />

                    {/* Stage: Final Interview */}
                    <StageBlock
                      stage="Final Interview"
                      statusField="finalInterviewStatus"
                      dateField="finalInterviewDate"
                      formData={formData}
                      handleChange={handleChange}
                      handleDateChange={handleDateChange}
                      isDisabled={
                        !["Passed", "N/A"].includes(
                          formData.clientInterviewStatus
                        ) || formData.overallStatus !== "Active Application"
                      }
                    />

                    {/* Stage: Job Offer */}
                    <StageBlock
                      stage="Job Offer"
                      statusField="jobOfferStatus"
                      dateField="jobOfferDate"
                      formData={formData}
                      handleChange={handleChange}
                      handleDateChange={handleDateChange}
                      isDisabled={
                        !["Passed", "N/A"].includes(
                          formData.finalInterviewStatus
                        ) || formData.overallStatus !== "Active Application"
                      }
                    />

                    {/* Stage: Onboarding */}
                    <StageBlock
                      stage="Onboarding"
                      statusField="onboardingStatus"
                      dateField="onboardingDate"
                      formData={formData}
                      handleChange={handleChange}
                      handleDateChange={handleDateChange}
                      isDisabled={
                        formData.jobOfferStatus !== "Accepted" ||
                        formData.overallStatus !== "Active Application"
                      }
                    />

                    {/* Stage: Endorsement */}
                    <StageBlock
                      stage="Endorsement"
                      statusField="endorsementStatus"
                      dateField="endorsementDateTime"
                      formData={formData}
                      handleChange={handleChange}
                      handleDateChange={handleDateChange}
                      isDisabled={
                        formData.onboardingStatus !== "Onboarded" ||
                        formData.overallStatus !== "Active Application"
                      }
                    />

                    {/* Fallout */}
                    <div className="border rounded-lg p-3 bg-slate-50">
                      <p className="text-xs font-semibold text-slate-600 mb-2">
                        Fallout / Resigned within 30 days from Hire Date
                      </p>

                      {/* Fallout Status */}
                      <select
                        name="fallout"
                        value={formData.fallout}
                        onChange={handleChange}
                        disabled={formData.overallStatus !== "Successful Hire"}
                        required
                        className="w-full mb-2 px-2 py-1 border rounded text-sm bg-white disabled:bg-slate-100"
                      >
                        <option value="" disabled>
                          Select
                        </option>
                        <option value="Yes">Yes</option>
                        <option value="N/A">N/A</option>
                      </select>

                      {/* Fallout Date */}
                      <input
                        type="date"
                        name="falloutDateTime"
                        value={
                          formData.falloutDateTime === "1900-01-01"
                            ? ""
                            : formData.falloutDateTime
                        }
                        onChange={handleDateChange}
                        disabled={
                          !formData.fallout || formData.fallout === "N/A"
                        }
                        required={
                          formData.fallout && formData.fallout !== "N/A"
                        }
                        className="w-full px-2 py-1 border rounded text-sm disabled:bg-slate-100"
                      />
                    </div>

                    {/* Overall Status */}
                    <div>
                      <label className="block text-sm font-semibold">
                        Overall Status
                      </label>
                      <select
                        name="overallStatus"
                        value={formData.overallStatus}
                        onChange={handleChange}
                        className="w-full border rounded h-10 px-3"
                        required
                      >
                        <option value="">Select</option>
                        <option value="Active Application">
                          Active Application
                        </option>
                        <option value="Reprofiled">Reprofiled</option>
                        <option value="Not Qualified">Not Qualified</option>
                        <option value="Successful Hire">Successful Hire</option>
                        <option value="Failed">Failed</option>
                        <option value="Cancelled Application">
                          Cancelled Application
                        </option>
                        <option value="Pooling Discontinued">
                          Pooling Discontinued
                        </option>
                        <option value="Fallout">Fallout</option>
                      </select>
                    </div>
                  </div>

                  {/* === Remarks & Voice Recording === */}
                  <div className="flex flex-row gap-6">
                    {/* Remarks */}
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">
                        Remarks
                      </label>
                      <textarea
                        name="remarks"
                        value={formData.remarks || ""}
                        onChange={handleChange}
                        className="border rounded-md text-sm px-3 py-2 resize-none w-full"
                        style={{
                          width: "730px",
                          height: "100px",
                        }}
                      />
                    </div>

                    {/* Voice Recording */}
                    <div className="w-[355px]">
                      <label className="block text-sm font-medium mb-1">
                        Voice Recording
                      </label>
                      {formData.voiceUrl ? (
                        <a
                          href={`${SERVER_URL}/api/voice/${extractFileName(
                            formData.voiceUrl
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline text-sm"
                        >
                          View Voice Recording
                        </a>
                      ) : (
                        <p className="text-sm text-red-500 mt-2">
                          No voice recording submitted
                        </p>
                      )}
                    </div>
                  </div>

                  {/* === Email Buttons === */}
                  <div className="flex flex-wrap gap-3 mt-4">
                    <button
                      type="button"
                      onClick={sendVoiceRecordingEmail}
                      className="px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200"
                    >
                      {isSendingVoice
                        ? "Sending..."
                        : "Send Voice Recording Instructions"}
                    </button>
                    <button
                      type="button"
                      onClick={sendTypingTestEmail}
                      className="px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200"
                    >
                      {isSendingTyping ? "Sending..." : "Send Typing Test"}
                    </button>
                    <button
                      type="button"
                      onClick={sendEOLTestEmail}
                      className="px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200"
                    >
                      {isSendingEOL ? "Sending..." : "Send EOL Assessment"}
                    </button>
                  </div>

                  {/* === Modal Footer === */}
                  <div className="flex justify-end items-center gap-3 pt-6 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsUpdateCycleModalOpen(false)}
                      className="px-4 py-2 text-sm rounded-md border text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
        </div>
      </div>
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

const ReadOnlyInput = ({ label, value }) => (
  <div>
    <label className="block text-sm text-slate-600 mb-1">{label}</label>
    <input
      type="text"
      value={value || "—"}
      disabled
      className="w-full px-3 py-2 rounded border text-sm bg-slate-100 text-slate-800"
    />
  </div>
);

const SelectInput = ({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
}) => (
  <div>
    <label className="block text-sm text-slate-600 mb-1">
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
    <select
      name={name}
      value={value || ""}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className="w-full px-3 py-2 rounded border text-sm bg-white text-slate-800"
    >
      <option value="" disabled>
        Select
      </option>
      {options.map((opt, i) => (
        <option key={i} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

const StageBlock = ({
  stage,
  statusField,
  dateField,
  formData,
  handleChange,
  handleDateChange,
  isDisabled,
}) => {
  const statusValue = formData[statusField];
  const dateValue =
    formData[dateField] === "1900-01-01" ? "" : formData[dateField];

  return (
    <div className="border rounded-lg p-3 bg-slate-50">
      <p className="text-xs font-semibold text-slate-600 mb-2">{stage}</p>

      {/* Status */}
      <select
        name={statusField}
        value={statusValue || ""}
        onChange={handleChange}
        disabled={isDisabled}
        required
        className="w-full mb-2 px-2 py-1 border rounded text-sm bg-white disabled:bg-slate-100"
      >
        <option value="" disabled>
          Select Status
        </option>
        <option value="Passed">Passed</option>
        <option value="Failed">Failed</option>
        <option value="No Show">No Show</option>
        <option value="Cancelled">Cancelled</option>
        <option value="N/A">N/A</option>
      </select>

      {/* Date */}
      <input
        type="date"
        name={dateField}
        value={dateValue || ""}
        onChange={handleDateChange}
        disabled={isDisabled || !statusValue || statusValue === "N/A"}
        required={!!statusValue && statusValue !== "N/A"}
        className="w-full px-2 py-1 border rounded text-sm disabled:bg-slate-100"
      />
    </div>
  );
};

// ✅ Correct export using React.memo
export default RecruitmentTracker;

//BACK UP 1/12/2026
