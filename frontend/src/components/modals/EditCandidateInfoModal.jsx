import React from "react";
import { SERVER_URL } from "../lib/constants";
import { api } from "../lib/axiosInterceptor";

const Required = () => <span className="text-red-500 ml-1">*</span>;

export default function EditCandidateInfoModal({
  isOpen,
  onClose,
  formData,
  handleEdit,
  handleChange,
  handleFileChange,
  isSaving,
  showReferralField,
  markApplicantAsViewed,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-6">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl p-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Edit Candidate Information
            </h2>
            <p className="text-sm text-gray-500">
              {formData.candidatename} · {formData.applied_position_title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleEdit}
          encType="multipart/form-data"
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Application ID */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Application ID <Required />
              </label>
              <input
                type="text"
                value={formData.applicationid || ""}
                readOnly
                className="w-full border rounded h-10 px-3 bg-slate-100"
                required
              />
            </div>

            {/* Application Source */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Application Source <Required />
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
                <option value="QuickApp - Referral">QuickApp - Referral</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Referral Code */}
            {showReferralField && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Referral Code <Required />
                </label>
                <input
                  type="text"
                  name="referral_code"
                  value={formData.referral_code || ""}
                  onChange={handleChange}
                  className="w-full border rounded h-10 px-3"
                  required
                />
              </div>
            )}

            {/* Applicant Type */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Applicant Type <Required />
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
                Name <Required />
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
                Gender <Required />
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
                Role Applied <Required />
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
                Position Title <Required />
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

            {/* Phones */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Phone 1 <Required />
              </label>
              <input
                type="text"
                name="candidatephone1"
                value={formData.candidatephone1 || ""}
                onChange={handleChange}
                maxLength="11"
                className="w-full border rounded h-10 px-3"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone 2</label>
              <input
                type="text"
                name="candidatephone2"
                value={formData.candidatephone2 || ""}
                onChange={handleChange}
                maxLength="11"
                className="w-full border rounded h-10 px-3"
              />
            </div>

            {/* Emails */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Email 1 <Required />
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
              <label className="block text-sm font-medium mb-1">Email 2 </label>
              <input
                type="email"
                name="candidateemail2"
                value={formData.candidateemail2 || ""}
                onChange={handleChange}
                className="w-full border rounded h-10 px-3"
              />
            </div>

            {/* Resume */}
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
                      { withCredentials: true },
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

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-md text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
