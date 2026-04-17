import React from "react";

export default function NewCandidateModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  handleChange,
  handleFileChange,
  isSaving,
  showReferralField,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-6">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl p-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            New Candidate Application
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        {/* Form */}
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
              <option value="Internal Job Posting">Internal Job Posting</option>
              <option value="Jobstreet">Jobstreet</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Referral">Referral</option>
              <option value="TikTok">TikTok</option>
              <option value="Walk In">Walk In</option>
              <option value="QuickApp">QuickApp</option>
              <option value="QuickApp - Referral">QuickApp - Referral</option>
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

          {/* Role Applied */}
          <div>
            <label className="block font-medium mb-1">
              Role Applied <span className="text-red-500">*</span>
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
            <label className="block font-medium mb-1">
              Position Title <span className="text-red-500">*</span>
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

          {/* Department */}
          <div>
            <label className="block font-medium mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              name="department"
              value={formData.department || ""}
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
              value={formData.nameTitle || ""}
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
            <label className="block font-medium mb-1">Name Suffix</label>
            <select
              name="nameSuffix"
              value={formData.nameSuffix || ""}
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
              value={formData.lastName || ""}
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
              value={formData.firstName || ""}
              onChange={handleChange}
              className="w-full border rounded h-10 px-3"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Middle Name</label>
            <input
              type="text"
              name="middleName"
              value={formData.middleName || ""}
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

          {/* Contact Info */}
          <div>
            <label className="block font-medium mb-1">
              Phone 1 <span className="text-red-500">*</span>
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
              value={formData.candidatephone2 || ""}
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
              value={formData.candidateemail1 || ""}
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
              value={formData.candidateemail2 || ""}
              onChange={handleChange}
              className="w-full border rounded h-10 px-3"
            />
          </div>

          {/* Resume Upload */}
          <div>
            <label className="block font-medium mb-1">Resume Attachment</label>
            <input
              type="file"
              name="resume"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="w-full border rounded h-10 px-3 pt-[6px]"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
          <button
            type="button"
            onClick={onClose}
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
  );
}
