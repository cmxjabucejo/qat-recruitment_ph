import axios from "axios";
import { SERVER_URL } from "../lib/constants";

class UserService {
  static BASE_URL = SERVER_URL;

  /** --------------------------------
   * 🧠 Token Handling
   --------------------------------- */
  static getToken() {
    return localStorage.getItem("token");
  }

  static authHeader(token = UserService.getToken()) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  /** --------------------------------
   * 🔐 Access & Profile
   --------------------------------- */
  static async getUserAccess(userid) {
    try {
      const response = await axios.get(
        `${UserService.BASE_URL}/api/userAccess?userid=${userid}`,
        UserService.authHeader(),
      );
      return response?.data;
    } catch (err) {
      throw new Error(
        err?.response?.data?.message || "Failed fetching user access",
      );
    }
  }

  static async fetchAndStoreUserAccess(userid) {
    const access = await UserService.getUserAccess(userid);
    if (access) {
      localStorage.setItem("USER_ROLE", access.USER_ROLE);
      localStorage.setItem("EMPLOYEEID", access.EMPLOYEEID);
      localStorage.setItem("name", access.NAME);
    }
  }

  static async getYourProfile(token) {
    try {
      const response = await axios.get(
        `${UserService.BASE_URL}/adminuser/get-profile`,
        UserService.authHeader(token),
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  }

  /** --------------------------------
   * 🔐 Admin Users CRUD
   --------------------------------- */

  static async getAllUsers(token) {
    try {
      const response = await axios.get(
        `${UserService.BASE_URL}/admin/get-all-users`,
        UserService.authHeader(token),
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  }

  static async getUserById(userId, token) {
    try {
      const response = await axios.get(
        `${UserService.BASE_URL}/admin/get-users/${userId}`,
        UserService.authHeader(token),
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  }

  static async deleteUser(userId, token) {
    try {
      const response = await axios.delete(
        `${UserService.BASE_URL}/admin/delete/${userId}`,
        UserService.authHeader(token),
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  }

  static async updateUser(userId, userData, token) {
    try {
      const response = await axios.put(
        `${UserService.BASE_URL}/admin/update/${userId}`,
        userData,
        UserService.authHeader(token),
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  }

  /** --------------------------------
   * 🔐 Registration & Password
   --------------------------------- */

  // Use authHeader function for authorization
  static async register(userData, token) {
    try {
      const response = await axios.post(
        `${UserService.BASE_URL}/auth/register`,
        userData,
        UserService.authHeader(token),
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  }

  // New method to update the password
  static async updatePassword(password, token) {
    try {
      const response = await axios.put(
        `${UserService.BASE_URL}/users/updatePassword`, // Endpoint for updating password
        { password }, // Send only the password field in the request body
        UserService.authHeader(token),
      );
      return response.data;
    } catch (err) {
      if (err.response) {
        throw new Error(err.response.data.message || "Password update failed");
      } else {
        throw new Error("Network error, please try again");
      }
    }
  }

  /** ------------------ APPLICANT LOGIN VIA OTP ------------------ **/
  static async loginApplicant({
    email,
    firstname = "",
    lastname = "",
    middlename = "",
    picture = "/default-avatar.png",
    role = "Agent",
    token = "",
  }) {
    const userid = email;

    // Store token and base info
    localStorage.setItem("token", token);
    localStorage.setItem("userid", userid);
    localStorage.setItem("name", `${firstname} ${lastname}`);
    localStorage.setItem("firstname", firstname);
    localStorage.setItem("lastname", lastname);
    localStorage.setItem("middlename", middlename);
    localStorage.setItem("picture", picture);
    localStorage.setItem("pwdType", "otp"); // mark OTP login

    try {
      const access = await UserService.getUserAccess(userid);

      if (access?.USER_ROLE) {
        localStorage.setItem("USER_ROLE", access.USER_ROLE);
        localStorage.setItem("EMPLOYEEID", access.EMPLOYEEID || "");
        localStorage.setItem("name", access.NAME || `${firstname} ${lastname}`);
      } else {
        localStorage.setItem("USER_ROLE", role);
      }
    } catch (err) {
      console.warn("⚠️ OTP login: Failed to fetch USER_ROLE:", err.message);
      localStorage.setItem("USER_ROLE", role);
    }
  }

  // ✅ Save pending user (before OTP verification)
  static setPendingUser(user) {
    if (user) {
      localStorage.setItem("pendingUser", JSON.stringify(user));
    }
  }

  static getPendingUser() {
    const raw = localStorage.getItem("pendingUser");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  static clearPendingUser() {
    localStorage.removeItem("pendingUser");
    localStorage.removeItem("pendingOtpHashed");
    localStorage.removeItem("pendingEmail");
  }

  static loginUser({
    userId,
    email,
    firstname = "",
    lastname = "",
    providerId,
    userLevel = "",
    userStatus = "",
  }) {
    const finalId =
      userId || providerId || (email ? `manual_${email}` : undefined);

    if (!finalId) {
      console.warn("loginUser called without a valid userId/providerId/email");
    }

    localStorage.setItem("userId", finalId || "");
    localStorage.setItem("userEmail", email || "");
    localStorage.setItem("userFirstname", firstname || "");
    localStorage.setItem("userLastname", lastname || "");

    // ✅ Keep userLevel and userStatus
    localStorage.setItem("user_access_level", userLevel || "");
    localStorage.setItem("user_status", userStatus || "");

    localStorage.setItem("sessionVerified", "1");

    // ✅ ADD: Save login timestamp
    const now = new Date().getTime();
    localStorage.setItem("loginTime", now);

    this.clearPendingUser();

    return finalId;
  }

  static getCurrentUser() {
    const userId = localStorage.getItem("userId");
    const email = localStorage.getItem("userEmail");
    const firstname = localStorage.getItem("userFirstname");
    const lastname = localStorage.getItem("userLastname");
    const user_access_level = localStorage.getItem("user_access_level") || "";
    const user_status = localStorage.getItem("user_status") || "";

    return {
      userId,
      email,
      firstname,
      lastname,
      user_access_level,
      user_status,
    };
  }

  /** AUTHENTICATION CHECKER **/
  static logout() {
    const keysToRemove = [
      "token",
      "role",
      "pwdType",
      "userid",
      "name",
      "firstname",
      "lastname",
      "middlename",
      "picture",
    ];
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem("userId");
    localStorage.removeItem("sessionVerified");
    localStorage.removeItem("loginTime"); // ✅ IMPORTANT

    localStorage.removeItem("userEmail");
    localStorage.removeItem("userFirstname");
    localStorage.removeItem("userLastname");

    // ✅ Clear user access data
    localStorage.removeItem("user_access_level");
    localStorage.removeItem("user_status");

    this.clearPendingUser();
  }

  static isAuthenticated() {
    const userId = localStorage.getItem("userId");
    const sessionVerified = localStorage.getItem("sessionVerified");
    const loginTime = localStorage.getItem("loginTime");

    if (!userId || sessionVerified !== "1" || !loginTime) {
      return false;
    }

    const now = new Date().getTime();
    const twelveHours = 12 * 60 * 60 * 1000;

    // ⛔ Expired session
    if (now - Number(loginTime) > twelveHours) {
      this.logout();
      return false;
    }

    return true;
  }

  static getStoredUser() {
    return {
      token: localStorage.getItem("token"),
      role: localStorage.getItem("USER_ROLE"),
      userid: localStorage.getItem("userid"),
      name: localStorage.getItem("name"),
      pwdType: localStorage.getItem("pwdType"),
    };
  }

  /** ------------------ PENDING (PRE-LOGIN) ------------------ **/

  static setPendingApplicant({
    email,
    firstname,
    lastname,
    middlename,
    picture,
  }) {
    localStorage.setItem(
      "pendingApplicant",
      JSON.stringify({
        email,
        firstname,
        lastname,
        middlename,
        picture,
      }),
    );
  }

  static getPendingApplicant() {
    const raw = localStorage.getItem("pendingApplicant");
    return raw ? JSON.parse(raw) : null;
  }

  // static getApplicant() {
  //   const email = localStorage.getItem("applicantEmail");
  //   const firstname = localStorage.getItem("applicantFirstname");
  //   const lastname = localStorage.getItem("applicantLastname");
  //   const middlename = localStorage.getItem("applicantMiddlename") || "";
  //   const picture =
  //     localStorage.getItem("applicantPicture") || "/default-avatar.png";
  //   const applicationId = localStorage.getItem("applicationId");
  //   return { email, firstname, lastname, middlename, picture, applicationId };
  // }

  /** ------------------ ROLE HELPERS ------------------ **/

  // ✅ Returns true if USER_ROLE is in allowedRoles array
  static hasRole(allowedRoles = []) {
    const role = localStorage.getItem("USER_ROLE");
    return allowedRoles.includes(role);
  }

  //with use, App, Navbar
  // static isAdmin() {
  //   return this.getRole() !== "user";
  // }

  // static isUser() {
  //   return this.getRole() === "user";
  // }

  // static adminOnly() {
  //   return this.isAuthenticated() && this.isAdmin();
  // }

  // //used in Home
  // static getQARole() {
  //   return localStorage.getItem("CMXQA_AUDIT");
  // }

  // //used in Home & AuditViewModal
  // static getQAAdminRole() {
  //   return localStorage.getItem("CMX_QA_ADMIN");
  // }

  // static agentOnly() {
  //   return (
  //     localStorage.getItem("CMXQA_AUDIT") !== "true" &&
  //     localStorage.getItem("CMX_QA_ADMIN") !== "true"
  //   );
  // }

  // static isTrainingRequestor() {
  //   return localStorage.getItem("CMX_TRAINING_REQUESTOR") === "true";
  // }

  // //used in EditTrainingModal
  // static isTrainingAdmin() {
  //   return localStorage.getItem("CMX_TRAINING_ADMIN") === "true";
  // }

  // static getStoredUser() {
  //   return {
  //     token: localStorage.getItem("token"),
  //     role: localStorage.getItem("role"),
  //     userid: localStorage.getItem("userid"),
  //     pwdType: localStorage.getItem("pwdType"),
  //     name: localStorage.getItem("name"),
  //   };
  // }

  // static isAuthenticated() {
  //   const token = localStorage.getItem("token");
  //   return !!token;
  // }

  // Update the login method to use USERID instead of email
  // static async login(userid, password) {
  //   try {
  //     // console.log("Login request:", { userid, password });
  //     const response = await axios.post(`${UserService.BASE_URL}/auth/login`, {
  //       userid,
  //       password,
  //     });

  //     //console.log("Login response data:", response.data); // Debug: Log response data

  //     const { token, role, pwdType, name, site, CMXDR } = response.data;

  //     // Store the token, role, and pwdType
  //     localStorage.setItem("token", token);
  //     localStorage.setItem("role", role);
  //     localStorage.setItem("userid", userid);
  //     localStorage.setItem("pwdType", pwdType);
  //     localStorage.setItem("name", name);
  //     // localStorage.setItem("CMXDR", CMXDR); // ✅ Add this

  //     return response.data;
  //   } catch (err) {
  //     throw new Error(err.response?.data?.message || "Login failed");
  //   }
  // }
}

export const USER_ROLES = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  QA: "QA",
  TL: "TL",
  AGENT: "Agent",
  USER: "User",
};

export default UserService;
