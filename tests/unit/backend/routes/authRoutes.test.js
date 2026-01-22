import { describe, test, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";
import authRoutes from "../../../../backend/routes/authRoutes.js";

describe("Auth Routes", () => {
  let app;
  let authService;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    authService = {
      authenticate: async (login, hash) => {
        if (
          login === "admin" &&
          hash ===
            "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"
        ) {
          return { success: true, userId: 1, userName: "admin" };
        }
        return { success: false, message: "Invalid password" };
      },
      register: async (login) => {
        if (login === "admin")
          return { success: false, message: "User already exists" };
        return { success: true, userId: 42 };
      },
    };
    app.set("authService", authService);
    app.use("/api/auth", authRoutes);
  });

  describe("POST /api/auth/login", () => {
    test("should login user successfully", async () => {
      const response = await request(app).post("/api/auth/login").send({
        login: "admin",
        passwordHash:
          "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBe(1);
      expect(response.body.userName).toBe("admin");
    });

    test("should fail with invalid credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({
        login: "admin",
        passwordHash: "wronghash",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid password");
    });

    test("should fail with missing login", async () => {
      const response = await request(app).post("/api/auth/login").send({
        passwordHash: "hash",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Login and passwordHash are required");
    });

    test("should fail with missing passwordHash", async () => {
      const response = await request(app).post("/api/auth/login").send({
        login: "admin",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("should handle server errors", async () => {
      const errorAuthService = {
        authenticate: async () => {
          throw new Error("Database error");
        },
      };
      app.set("authService", errorAuthService);

      const response = await request(app).post("/api/auth/login").send({
        login: "admin",
        passwordHash: "hash",
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/register", () => {
    test("should register new user successfully", async () => {
      const response = await request(app).post("/api/auth/register").send({
        login: "newuser",
        passwordHash: "hash123",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBeDefined();
    });

    test("should fail if user already exists", async () => {
      const response = await request(app).post("/api/auth/register").send({
        login: "admin",
        passwordHash: "hash123",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User already exists");
    });

    test("should fail with missing login", async () => {
      const response = await request(app).post("/api/auth/register").send({
        passwordHash: "hash",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("should fail with missing passwordHash", async () => {
      const response = await request(app).post("/api/auth/register").send({
        login: "newuser",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("should handle server errors", async () => {
      const errorAuthService = {
        register: async () => {
          throw new Error("Database error");
        },
      };
      app.set("authService", errorAuthService);

      const response = await request(app).post("/api/auth/register").send({
        login: "newuser",
        passwordHash: "hash",
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
