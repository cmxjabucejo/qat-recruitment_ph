import React, { useEffect } from "react";

import { SERVER_URL } from "../lib/constants";
import { api } from "../lib/axiosInterceptor";

/* ---------- Read Only Input ---------- */
const ReadOnlyInput = ({ label, value }) => (
  <div>
    <label className="block text-sm text-slate-600 mb-1">{label}</label>
    <input
      type="text"
      value={value ?? ""}
      disabled
      className="w-full px-3 py-2 rounded border text-sm bg-slate-100 text-slate-800"
    />
  </div>
);

/* ---------- Select Input ---------- */
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
      value={value ?? ""}
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

/* ---------- Stage Block ---------- */
const StageBlock = ({
  stage,
  statusField,
  dateField,
  formData,
  handleChange,
  handleDateChange,
  isDisabled,
}) => {
  const statusValue = formData[statusField] ?? "";

  const formatDate = (date) => {
    if (!date || date === "1900-01-01") return "";
    return date.includes("T") ? date.split("T")[0] : date;
  };

  const dateValue = formatDate(formData[dateField]);

  return (
    <div className="border rounded-lg p-3 bg-slate-50">
      <p className="text-xs font-semibold text-slate-600 mb-2">
        {stage} <Required />
      </p>

      <select
        name={statusField}
        value={statusValue}
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

      <input
        type="date"
        name={dateField}
        value={dateValue}
        onChange={handleDateChange}
        disabled={isDisabled || !statusValue || statusValue === "N/A"}
        required={!!statusValue && statusValue !== "N/A"}
        className="w-full px-2 py-1 border rounded text-sm disabled:bg-slate-100"
      />
    </div>
  );
};

/* ---------- Required Indicator ---------- */
const Required = () => <span className="text-red-500 ml-1">*</span>;

export default function UpdateCandidateLifecycleModal({
  isOpen,
  onClose,
  selected,
  formData,
  setFormData,

  // handlers
  handleUpdateLifecycle,
  handleChange,
  handleDateChange,
  handleAccountChange,
  handleLobChange,
  handleTaskChange,
  handleRecruiterChange,

  // data
  accountOptions,
  lobOptions,
  taskOptions,
  recruiters,

  // helpers
  markApplicantAsViewed,
  extractFileName,

  // email actions
  sendVoiceRecordingEmail,
  sendTypingTestEmail,
  sendEOLTestEmail,

  // states
  isSaving,
  isSendingVoice,
  isSendingTyping,
  isSendingEOL,
}) {
  useEffect(() => {}, [formData]);

  if (!isOpen || !selected) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl p-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Update Candidate Lifecycle
            </h2>
            <p className="text-sm text-gray-500">
              {selected.candidatename} · {selected.applied_position_title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleUpdateLifecycle} className="space-y-6">
          {/* === BASIC DETAILS === */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ReadOnlyInput
              label="Application ID"
              value={formData.applicationid}
            />
            <ReadOnlyInput label="Name" value={formData.candidatename} />
            <ReadOnlyInput label="Gender" value={formData.gender} />
            <ReadOnlyInput label="Role Applied" value={formData.applied_role} />
            <ReadOnlyInput
              label="Position Title"
              value={formData.applied_position_title}
            />

            <SelectInput
              label="Department"
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
              label="Role Profiled"
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
              label="Profiled for Account"
              name="profiledForAccount"
              value={formData.profiledForAccount}
              onChange={handleAccountChange}
              options={["N/A", ...accountOptions.map((a) => a.ACCOUNT)]}
              disabled={formData.department !== "Operations"}
              required
            />

            <SelectInput
              label="Line of Business"
              name="lob"
              value={formData.lob}
              onChange={handleLobChange}
              options={["N/A", ...lobOptions]}
              disabled={
                formData.department !== "Operations" ||
                !formData.profiledForAccount
              }
              required
            />

            <SelectInput
              label="Task"
              name="task"
              value={formData.task}
              onChange={handleTaskChange}
              options={["N/A", ...taskOptions]}
              disabled={!formData.lob}
              required
            />

            <SelectInput
              label="Recruiter"
              name="recruiter"
              value={formData.recruiter}
              onChange={handleRecruiterChange}
              options={recruiters.map((r) => r.NAME)}
              required
            />

            <SelectInput
              label="Work Setup"
              name="workSetup"
              value={formData.workSetup}
              onChange={handleChange}
              options={["On Site", "Work from Home", "Hybrid"]}
              required
            />
          </div>

          {/* === RESUME === */}
          <div className="flex items-start gap-6">
            {/* Uploaded Resume */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Uploaded Resume
              </label>
              {formData.candidatecvattachment ? (
                <button
                  type="button"
                  className="text-blue-600 underline text-sm"
                  onClick={async () => {
                    const res = await api.get(
                      `${SERVER_URL}/mediafiles/resume/${formData.candidatecvattachment}`,
                      {
                        withCredentials: true,
                      },
                    );
                    window.open(res.data.url, "_blank");
                    markApplicantAsViewed(formData.applicationid);
                  }}
                >
                  {formData.candidatecvattachment}
                </button>
              ) : (
                <p className="text-sm text-red-500">No file uploaded</p>
              )}
            </div>
          </div>

          {/* === STAGES === */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StageBlock
              stage="Initial Interview"
              statusField="initialInterviewStatus"
              dateField="initialInterviewDate"
              formData={formData}
              handleChange={handleChange}
              handleDateChange={handleDateChange}
              isDisabled={formData.overallStatus !== "Active Application"}
            />
            <StageBlock
              stage="Skills Assessment"
              statusField="skillsAssessmentStatus"
              dateField="skillsAssessmentDate"
              formData={formData}
              handleChange={handleChange}
              handleDateChange={handleDateChange}
              isDisabled={
                !["Passed", "N/A"].includes(formData.initialInterviewStatus) ||
                formData.overallStatus !== "Active Application"
              }
            />
            <StageBlock
              stage="Client Interview"
              statusField="clientInterviewStatus"
              dateField="clientInterviewDate"
              formData={formData}
              handleChange={handleChange}
              handleDateChange={handleDateChange}
              isDisabled={
                !["Passed", "N/A"].includes(formData.skillsAssessmentStatus) ||
                formData.overallStatus !== "Active Application"
              }
            />
            <StageBlock
              stage="Final Interview"
              statusField="finalInterviewStatus"
              dateField="finalInterviewDate"
              formData={formData}
              handleChange={handleChange}
              handleDateChange={handleDateChange}
              isDisabled={
                !["Passed", "N/A"].includes(formData.clientInterviewStatus) ||
                formData.overallStatus !== "Active Application"
              }
            />
            <StageBlock
              stage="Job Offer"
              statusField="jobOfferStatus"
              dateField="jobOfferDate"
              formData={formData}
              handleChange={handleChange}
              handleDateChange={handleDateChange}
              isDisabled={
                !["Passed", "N/A"].includes(formData.finalInterviewStatus) ||
                formData.overallStatus !== "Active Application"
              }
            />
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

            {/* Fallout */}
            <div className="border rounded-lg p-3 bg-slate-50">
              <p className="text-xs font-semibold text-slate-600 mb-2">
                Fallout / Resigned within 30 days from Hire Date <Required />
              </p>
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
              <input
                type="date"
                name="falloutDateTime"
                value={
                  formData.falloutDateTime === "1900-01-01"
                    ? ""
                    : formData.falloutDateTime?.split("T")[0]
                }
                onChange={handleDateChange}
                disabled={!formData.fallout || formData.fallout === "N/A"}
                required={formData.fallout && formData.fallout !== "N/A"}
                className="w-full px-2 py-1 border rounded text-sm disabled:bg-slate-100"
              />
            </div>

            {/* Overall Status */}
            <div>
              <label className="block text-sm font-semibold">
                Overall Status <Required />
              </label>
              <select
                name="overallStatus"
                value={formData.overallStatus}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded border text-sm bg-white text-slate-800"
                required
              >
                <option value="">Select</option>
                <option value="Active Application">Active Application</option>
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

            {/* Remarks */}
            <div className="md:col-span-3">
              <label
                className="block text-sm font-semibold mb-1"
                htmlFor="remarks"
              >
                Remarks
              </label>
              <textarea
                id="remarks"
                name="remarks"
                value={formData.remarks || ""}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 rounded border text-sm bg-white text-slate-800"
                placeholder="Add any notes or remarks about the candidate..."
              />
            </div>
          </div>

          {/* === EMAIL BUTTONS === */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={sendVoiceRecordingEmail}
              className="px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded"
            >
              {isSendingVoice
                ? "Sending..."
                : "Send Voice Recording Instructions"}
            </button>
            <button
              type="button"
              onClick={sendTypingTestEmail}
              className="px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded"
            >
              {isSendingTyping ? "Sending..." : "Send Typing Test"}
            </button>
            <button
              type="button"
              onClick={sendEOLTestEmail}
              className="px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded"
            >
              {isSendingEOL ? "Sending..." : "Send EOL Assessment"}
            </button>
          </div>

          {/* === FOOTER === */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => {
                onClose();
                setFormData({}); // 👈 Reset on modal cancel as well
              }}
              className="px-4 py-2 text-sm border rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
