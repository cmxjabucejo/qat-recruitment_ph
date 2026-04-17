import React from "react";

const ThankYou = () => {
  const handleClose = () => {
    // ✅ Clear all stored data
    localStorage.removeItem("applicationId");
    localStorage.removeItem("isChecked");
    localStorage.removeItem("grammarAnswers");
    localStorage.removeItem("readingAnswers");
    localStorage.removeItem("sentenceAnswers");

    // ✅ Force browser to navigate to a blank page
    window.location.href = "about:blank";
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-custom-gradient p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="bg-white p-6 sm:p-8 md:p-10 lg:p-12 rounded-lg shadow-lg w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-lg xl:max-w-xl text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl text-left font-bold text-[#253E88]">
          Thank you for Completing the English Assessment!
        </h1>
        <p className="mt-4 text-gray-700 text-sm sm:text-base md:text-lg text-left">
          We truly appreciate the time and effort you invested in this test.{" "}
          <br></br> <br></br> Our recruitment team will reach out to you for the
          assessment result and next steps.
        </p>
        <div className="mt-6">
          <button
            onClick={handleClose}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
