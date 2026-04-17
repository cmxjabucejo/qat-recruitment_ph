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
        UserService.authHeader()
      );
      return response?.data;
    } catch (err) {
      throw new Error(
        err?.response?.data?.message || "Failed fetching user access"
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
        UserService.authHeader(token)
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
        UserService.authHeader(token)
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
        UserService.authHeader(token)
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
        UserService.authHeader(token)
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
        UserService.authHeader(token)
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
        UserService.authHeader(token)
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
        UserService.authHeader(token)
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
  }

  static isAuthenticated() {
    return !!localStorage.getItem("token") && !!localStorage.getItem("userid");
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
      })
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
