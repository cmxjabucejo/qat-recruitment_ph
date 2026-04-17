// src/components/common/Toast.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const Toast = ({ show, type, message }) => {
  const isSuccess = type === "success";
  const icon = isSuccess ? "✔️" : "❌";
  const bgColor = isSuccess ? "bg-green-500" : "bg-red-500";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm flex items-center gap-3 ${bgColor}`}
        >
          <span className="text-lg">{icon}</span>
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
