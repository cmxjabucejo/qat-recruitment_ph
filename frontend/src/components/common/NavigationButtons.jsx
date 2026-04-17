import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { SERVER_URL } from "../lib/constants"; // Adjust this based on your setup

const NavigationButtons = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userid = location.state?.userid || ""; // Get user ID from login state
  const [managers, setManagers] = useState(null);
  const [error, setError] = useState("");
  const [manualEntry, setManualEntry] = useState(false); // Toggle for manual input
  const [manualEmployeeID, setManualEmployeeID] = useState("");
  const [manualEmployeeName, setManualEmployeeName] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toLocaleString()); // Auto-fill date

  const [selectedTask, setSelectedTask] = useState("");
  const [accountOptions, setAccountOptions] = useState([]);
  const [taskOptions, setTaskOptions] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");

  // Fetch manager details
  useEffect(() => {
    const fetchManagers = async () => {
      console.log("🔍 Checking userid before API call:", userid); // Debugging

      if (!userid) {
        console.error("❌ USERID is missing! Check login navigation.");
        setError("User ID is missing. Please log in again.");
        return;
      }

      try {
        const response = await axios.get(`${SERVER_URL}/api/employeeManagers`, {
          params: { userid },
        });

        console.log("✅ API Response:", response.data); // Debugging
        setManagers(response.data);
      } catch (err) {
        console.error(
          "❌ Error fetching manager data:",
          err.response?.data || err.message
        );
        setError(
          err.response?.data?.error || "Unable to fetch manager details."
        );
        setManualEntry(true); // Enable manual entry if the employee is not found
      }
    };

    fetchManagers();
  }, [userid]);

  const fetchAccountList = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/scheduler/accountList`);

      if (!response.ok) {
        console.error(
          "❌ Failed to fetch account list:",
          response.status,
          response.statusText
        );
        throw new Error("Failed to fetch account list");
      }

      const data = await response.json();

      // Extract only unique accounts for the dropdown
      const uniqueAccounts = Object.keys(data).sort();
      setAccountOptions(uniqueAccounts);
      console.log("✅ Accounts Fetched:", uniqueAccounts);

      return data; // Return for reuse
    } catch (error) {
      console.error("❌ Error fetching account data:", error);
    }
  };

  // Fetch tasks based on selected account
  const fetchTaskList = async (account) => {
    try {
      if (!account) {
        console.warn("⚠️ No account selected. Skipping task fetch.");
        return;
      }

      // Fetch stored account-task mapping
      const accountTaskData = await fetchAccountList();
      console.log("🔍 Full Account-Task Mapping:", accountTaskData); // Debugging

      const tasks = accountTaskData[account] || []; // Get tasks for selected account
      setTaskOptions(tasks);

      console.log(`✅ Tasks for ${account}:`, tasks);
    } catch (error) {
      console.error("❌ Error fetching Task data:", error);
    }
  };

  // Fetch accounts on component mount
  useEffect(() => {
    fetchAccountList();
  }, []);

  // Fetch tasks when the selected account changes
  useEffect(() => {
    fetchTaskList(selectedAccount);
  }, [selectedAccount]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-custom-gradient p-4">
      <div className="bg-white p-8 md:p-10 rounded-lg shadow-lg w-full max-w-lg text-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Welcome to the Callmax Solutions Quality Assurance Test!
        </h2>
        <p className="text-black mt-4 text-left text-sm sm:text-base">
          At Callmax Solutions, we are committed to delivering the highest
          standards of quality in our processes and services. This Quality
          Assurance Test is designed to evaluate adherence to best practices,
          ensuring excellence in every aspect of our work.
          <br></br>
          <br></br>
          The test covers key areas such as process compliance, service
          consistency, and quality control measures. Please ensure you carefully
          follow the instructions and do not close your browser during the test.
          Good luck!
        </p>
        {/* Display Manager Information or Manual Entry */}
        {error && <p className="text-red-500">{error}</p>}

        {!manualEntry ? (
          managers && (
            <div className="mt-6 text-left bg-gray-100 p-4 rounded-md">
              <h3 className="text-lg font-semibold">Manager Details</h3>
              <p>
                <strong>Employee ID:</strong> {managers.EMPLOYEEID}
              </p>
              <p>
                <strong>L1 Manager:</strong> {managers.L1_MANAGER_NAME || "N/A"}
              </p>
              <p>
                <strong>L2 Manager:</strong> {managers.L2_MANAGER_NAME || "N/A"}
              </p>
              <p>
                <strong>L3 Manager:</strong> {managers.L3_MANAGER_NAME || "N/A"}
              </p>
            </div>
          )
        ) : (
          <div className="mt-6 text-left bg-gray-100 p-4 rounded-md">
            <h3 className="text-lg font-semibold text-red-600">
              Employee Not Found - Enter Details Manually
            </h3>

            <label className="block font-medium text-gray-700 mt-4">
              Employee ID:
            </label>
            <input
              type="text"
              value={manualEmployeeID}
              onChange={(e) => setManualEmployeeID(e.target.value)}
              placeholder="Enter Employee ID"
              className="w-full p-2 border rounded-md"
            />

            <label className="block font-medium text-gray-700 mt-4">
              Employee Name:
            </label>
            <input
              type="text"
              value={manualEmployeeName}
              onChange={(e) => setManualEmployeeName(e.target.value)}
              placeholder="Enter Employee Name"
              className="w-full p-2 border rounded-md"
            />

            <label className="block font-medium text-gray-700 mt-4">
              Date:
            </label>
            <input
              type="text"
              value={entryDate}
              readOnly
              className="w-full p-2 border rounded-md bg-gray-200"
            />
          </div>
        )}

        {/* Account and Task Dropdowns */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          {/* <div className="w-full">
            <label className="block font-medium text-gray-700">Account</label>
            <select
              className="w-full p-2 border rounded-md bg-white"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            >
              <option value="">Select an Account</option>
              {accountOptions.map((account, index) => (
                <option key={index} value={account}>
                  {account}
                </option>
              ))}
            </select>
          </div> */}

          {/* Task Dropdown */}
          {/* <div className="w-full">
            <label className="block font-medium text-gray-700">Task</label>
            <select
              className="w-full p-2 border rounded-md bg-white"
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              disabled={!selectedAccount} // Disable if no account is selected
            >
              <option value="">Select a Task</option>
              {taskOptions.map((task, index) => (
                <option key={index} value={task}>
                  {task}
                </option>
              ))}
            </select>
          </div> */}
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <button
            className="bg-blue-900 text-white py-3 px-4 rounded-md hover:bg-blue-800 transition"
            onClick={() => {
              console.log("Navigating to Assessment");
              navigate("/assessment");
            }}
            disabled={manualEntry && (!manualEmployeeID || !manualEmployeeName)}
          >
            {manualEntry ? "Proceed with Manual Entry" : "Start Assessment"}
          </button>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-blue-600 underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default NavigationButtons;
