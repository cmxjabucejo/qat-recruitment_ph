import axios from "axios";
import { SERVER_URL } from "../lib/constants";

class UserService {
  static BASE_URL = SERVER_URL;

  // Define the reusable authHeader function
  static authHeader(token) {
    return {
      headers: { Authorization: `Bearer ${token}` },
    };
  }

  static async getUserAccess(userid) {
    try {
      const response = await axios.get(
        `${UserService.BASE_URL}/api/userAccess?userid=${userid}`
      );
      return response?.data;
    } catch (err) {
      throw new Error(
        err?.response?.data?.message || "Failed fetching user access"
      );
    }
  }

  // Update the login method to use USERID instead of email
  static async login(userid, password) {
    try {
      // console.log("Login request:", { userid, password });
      const response = await axios.post(`${UserService.BASE_URL}/auth/login`, {
        userid,
        password,
      });

      //console.log("Login response data:", response.data); // Debug: Log response data

      const { token, role, pwdType, name, site, CMXDR } = response.data;

      // Store the token, role, and pwdType
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("userid", userid);
      localStorage.setItem("pwdType", pwdType);
      localStorage.setItem("name", name);
      localStorage.setItem("CMXDR", CMXDR); // ✅ Add this

      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || "Login failed");
    }
  }

  static getStoredUser() {
    return {
      token: localStorage.getItem("token"),
      role: localStorage.getItem("role"),
      userid: localStorage.getItem("userid"),
      pwdType: localStorage.getItem("pwdType"),
      name: localStorage.getItem("name"),
    };
  }

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

  /** AUTHENTICATION CHECKER **/
  static logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("pwdType");
  }

  static isAuthenticated() {
    const token = localStorage.getItem("token");
    return !!token;
  }

  static getRole() {
    return localStorage.getItem("role");
  }

  //with use, App, Navbar
  static isAdmin() {
    return this.getRole() !== "user";
  }

  static isUser() {
    return this.getRole() === "user";
  }

  static adminOnly() {
    return this.isAuthenticated() && this.isAdmin();
  }

  //used in Home
  static getQARole() {
    return localStorage.getItem("CMXQA_AUDIT");
  }

  //used in Home & AuditViewModal
  static getQAAdminRole() {
    return localStorage.getItem("CMX_QA_ADMIN");
  }

  static agentOnly() {
    return (
      localStorage.getItem("CMXQA_AUDIT") !== "true" &&
      localStorage.getItem("CMX_QA_ADMIN") !== "true"
    );
  }

  static isTrainingRequestor() {
    return localStorage.getItem("CMX_TRAINING_REQUESTOR") === "true";
  }

  //used in EditTrainingModal
  static isTrainingAdmin() {
    return localStorage.getItem("CMX_TRAINING_ADMIN") === "true";
  }
}

export default UserService;
