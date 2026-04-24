import React, { useState, useEffect } from "react";
import axios from "axios";
import { SERVER_URL } from "../lib/constants";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "../common/Header";
import Sidebar from "../common/Sidebar";

const Admin = ({ user }) => {
  const userName = user.fullName || localStorage.getItem("name") || "User";
  const userId = user.userid || localStorage.getItem("userid") || "";
  const [formData, setFormData] = useState({
    employeeid: "",
    firstname: "",
    middlename: "",
    lastname: "",
    email: "",
    phone_num: "",
    l1_manager_name: "",
    supervisorid: "", // 👈 New Field
    position: "",
    account: "",
    lob: "",
    hiredate: "",
    user_role: "",
    employeestatus: "",
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [employeeList, setEmployeeList] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/admin/list-employees`);
      setEmployeeList(res.data || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      toast.error("Failed to load employee list.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.firstname || !formData.lastname) {
      toast.error("Email, First Name, and Last Name are required.");
      return;
    }

    try {
      await axios.post(`${SERVER_URL}/api/admin/add-employee`, formData);
      toast.success("✅ Employee added successfully!");
      setFormData({
        employeeid: "",
        firstname: "",
        middlename: "",
        lastname: "",
        email: "",
        phone_num: "",
        l1_manager_name: "",
        position: "",
        account: "",
        lob: "",
        hiredate: "",
        user_role: "",
        employeestatus: "",
      });
      fetchEmployees(); // refresh table
    } catch (error) {
      console.error("Error adding employee:", error);
      toast.error("❌ Failed to add employee.");
    }
  };

  const fieldLabelMap = {
    employeeid: "Employee ID",
    firstname: "First Name",
    middlename: "Middle Name",
    lastname: "Last Name",
    email: "Email",
    phone_num: "Phone Number",
    l1_manager_name: "Supervisor",
    supervisorid: "Supervisor ID", // 👈 New
    position: "Position",
    account: "Account",
    lob: "LOB",
    hiredate: "Hire Date",
    user_role: "User Role",
    employeestatus: "Employee Status",
    created_datetime: "Created Date",
  };

  const formFields = [
    "employeeid",
    "firstname",
    "middlename",
    "lastname",
    "email",
    "phone_num",
    "l1_manager_name",
    "supervisorid",
    "position",
    "account",
    "lob",
    "hiredate",
    "user_role",
    "employeestatus",
  ];

  const handleRowDoubleClick = (employee) => {
    setSelectedEmployee({
      ...employee,
      original_email: employee.email, // ⬅️ Add this to track original email
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header userName={userName} userid={userId} pageTitle="Admin Panel" />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="relative h-full">
          <Sidebar isCollapsed={isSidebarCollapsed} />
          <button
            className="absolute top-1/2 right-[-8px] bg-gray-800 text-white p-2 rounded transform -translate-y-1/2 mr-2"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? "❯" : "❮"}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <ToastContainer />

          {/* Page Title */}
          <div className="bg-white p-4 rounded-lg shadow-md mb-4">
            <h1 className="text-2xl font-semibold text-gray-800">
              Admin Panel
            </h1>
          </div>

          {/* Two Column Layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Add Employee Form */}
            <div className="w-full lg:w-1/4 bg-white p-6 rounded shadow-md">
              <h2 className="text-xl font-bold mb-4">Add New Employee</h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
                {[
                  "employeeid",
                  "firstname",
                  "middlename",
                  "lastname",
                  "email",
                  "phone_num",
                  "l1_manager_name",
                  "supervisorid",
                  "position",
                  "account",
                  "lob",
                  "hiredate",
                  "user_role", // Added here
                  "employeestatus",
                ].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 capitalize mb-1">
                      {fieldLabelMap[field] || field}
                      {(field === "email" ||
                        field === "firstname" ||
                        field === "lastname" ||
                        field === "employeeid") && (
                        <span className="text-red-500"> *</span>
                      )}
                    </label>

                    {field === "user_role" ? (
                      <select
                        name="user_role"
                        value={formData.user_role || ""}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                      >
                        <option value="">Select Role</option>
                        <option value="Admin">Admin</option>
                        <option value="Manager">Manager</option>
                        <option value="QA">QA</option>
                        <option value="TL">Team Lead</option>
                        <option value="Agent">Agent</option>
                      </select>
                    ) : field === "employeestatus" ? (
                      <select
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                      >
                        <option value="">Select Status</option>
                        <option value="Regular">Regular</option>
                        <option value="Probationary">Probationary</option>
                      </select>
                    ) : field === "phone_num" ? (
                      <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500 w-full">
                        <img
                          src="https://flagcdn.com/w40/do.png"
                          alt="DO Flag"
                          className="w-5 h-5 mr-2"
                        />
                        <span className="mr-2 text-gray-700 text-sm">+1</span>
                        <input
                          type="tel"
                          name="phone_num"
                          value={formData.phone_num}
                          onChange={(e) => {
                            const input = e.target.value.replace(/\D/g, "");
                            if (input.length <= 10) {
                              setFormData((prev) => ({
                                ...prev,
                                phone_num: input,
                              }));
                            }
                          }}
                          className="flex-1 min-w-0 outline-none text-sm"
                          // placeholder="8091234567"
                          required
                        />
                      </div>
                    ) : (
                      <input
                        type={field === "hiredate" ? "date" : "text"}
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required={
                          field === "email" ||
                          field === "firstname" ||
                          field === "lastname" ||
                          field === "employeeid"
                        }
                      />
                    )}
                  </div>
                ))}
                <div className="col-span-full text-right">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                  >
                    Add Employee
                  </button>
                </div>
              </form>
            </div>

            {/* Employee List Table */}
            <div className="w-full lg:w-4/5 bg-white p-6 rounded shadow-md overflow-auto">
              <h2 className="text-xl font-bold mb-4">Employee List</h2>
              <div className="max-h-[600px] overflow-y-auto">
                <table className="min-w-full border text-sm">
                  <thead className="bg-gray-200 text-gray-700 sticky top-0 z-[1]">
                    <tr className="bg-blue-900 text-white text-sm">
                      {[
                        "employeeid",
                        "firstname",
                        "middlename",
                        "lastname",
                        "email",
                        "phone_num",
                        "l1_manager_name",
                        "supervisorid",
                        "position",
                        "account",
                        "lob",
                        "hiredate",
                        "user_role", // Display in table
                        "employeestatus",
                      ].map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left border-b border-gray-200 whitespace-nowrap"
                        >
                          {fieldLabelMap[col]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employeeList.length > 0 ? (
                      employeeList.map((emp, index) => (
                        <tr
                          key={index}
                          onDoubleClick={() => handleRowDoubleClick(emp)}
                          className="hover:bg-gray-200 transition cursor-pointer"
                        >
                          <td className="px-4 py-3 border-b border-gray-200">
                            {emp.employeeid || "—"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200">
                            {emp.firstname || "—"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200">
                            {emp.middlename || "—"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200">
                            {emp.lastname || "—"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200">
                            {emp.email || "—"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200">
                            {emp.phone_num || "—"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200">
                            {emp.l1_manager_name || "—"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200">
                            {emp.supervisorid || "—"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200">
                            {emp.position || "—"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200">
                            {emp.account || "—"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200">
                            {emp.lob || "—"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200">
                            {emp.hiredate || "—"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200">
                            {emp.user_role || "—"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200">
                            {emp.employeestatus || "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={14}
                          className="text-center py-4 text-gray-400"
                        >
                          No employees found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && selectedEmployee && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="relative bg-white p-6 rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-hidden my-8">
                  {/* Close Button */}
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl font-bold"
                    aria-label="Close"
                  >
                    &times;
                  </button>

                  <h2 className="text-xl font-semibold mb-4">Edit Employee</h2>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();

                      const requiredFields = [
                        "employeeid",
                        "firstname",
                        "lastname",
                        "user_role",
                        "employeestatus",
                      ];
                      const missingFields = requiredFields.filter(
                        (field) => !selectedEmployee[field]?.trim(),
                      );

                      if (missingFields.length > 0) {
                        toast.error(
                          `❌ Please fill in all required fields: ${missingFields
                            .map((f) => fieldLabelMap[f] || f)
                            .join(", ")}`,
                        );
                        return;
                      }

                      try {
                        await axios.put(
                          `${SERVER_URL}/api/admin/update-employee`,
                          selectedEmployee,
                        );
                        toast.success("✅ Employee updated successfully");
                        setIsEditModalOpen(false);
                        setSelectedEmployee(null);
                        fetchEmployees();
                      } catch (err) {
                        toast.error("❌ Failed to update employee");
                        console.error(err);
                      }
                    }}
                    className="flex flex-col max-h-[70vh] overflow-y-auto pr-2"
                  >
                    {[
                      "employeeid",
                      "firstname",
                      "middlename",
                      "lastname",
                      "email",
                      "phone_num",
                      "l1_manager_name",
                      "supervisorid",
                      "position",
                      "account",
                      "lob",
                      "hiredate",
                      "user_role",
                      "employeestatus",
                    ].map((key) => (
                      <div key={key} className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 capitalize mb-1">
                          {fieldLabelMap[key] || key}
                          {(key === "employeeid" ||
                            key === "firstname" ||
                            key === "lastname" ||
                            key === "user_role" ||
                            key === "employeestatus") && (
                            <span className="text-red-500"> *</span>
                          )}
                        </label>

                        {key === "email" ? (
                          <input
                            type="email"
                            name="email"
                            value={selectedEmployee[key] || ""}
                            readOnly
                            disabled
                            className="block w-full bg-gray-100 text-gray-500 border border-gray-300 rounded-md px-3 py-2 shadow-sm sm:text-sm cursor-not-allowed"
                          />
                        ) : key === "employeestatus" || key === "user_role" ? (
                          <select
                            name={key}
                            value={selectedEmployee[key] || ""}
                            onChange={(e) =>
                              setSelectedEmployee((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm sm:text-sm"
                          >
                            {key === "user_role" ? (
                              <>
                                <option value="">Select Role</option>
                                <option value="Admin">Admin</option>
                                <option value="Manager">Manager</option>
                                <option value="QA">QA</option>
                                <option value="TL">Team Lead</option>
                                <option value="Agent">Agent</option>
                              </>
                            ) : (
                              <>
                                <option value="">Select Status</option>
                                <option value="Regular">Regular</option>
                                <option value="Probationary">
                                  Probationary
                                </option>
                                <option value="Maternity">Maternity</option>
                                <option value="Terminated">Terminated</option>
                                <option value="Resigned">Resigned</option>
                                <option value="End of Contract">
                                  End of Contract
                                </option>
                              </>
                            )}
                          </select>
                        ) : (
                          <input
                            type={key === "hiredate" ? "date" : "text"}
                            name={key}
                            value={selectedEmployee[key] || ""}
                            onChange={(e) =>
                              setSelectedEmployee((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm sm:text-sm"
                          />
                        )}
                      </div>
                    ))}

                    {/* Hidden field: original_email */}
                    <input
                      type="hidden"
                      name="original_email"
                      value={
                        selectedEmployee?.original_email ||
                        selectedEmployee?.email ||
                        ""
                      }
                    />

                    <div className="text-right mt-4">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
