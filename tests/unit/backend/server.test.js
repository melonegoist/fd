import {
  jest,
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
} from "@jest/globals";
import request from "supertest";
import http from "http";
import express from "express";
import cors from "cors";
// Use mocked services instead of importing actual backend services to avoid ESM parsing issues
import authRoutes from "../../../backend/routes/authRoutes.js";
import currencyRoutes from "../../../backend/routes/currencyRoutes.js";
import stockRoutes from "../../../backend/routes/stockRoutes.js";
import favoritesRoutes from "../../../backend/routes/favoritesRoutes.js";
import reportRoutes from "../../../backend/routes/reportRoutes.js";

// Mock fetch for external APIs
global.fetch = jest.fn();

describe("Server Integration Tests", () => {
  let app;
  let httpServer;
  let db;

  beforeAll(() => {
    // Create Express app similar to server.js
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Initialize mocked services
    db = {
      users: [{ id: 1, login: "admin", passwordHash: "hash" }],
      findUserByLogin: async (login) =>
        db.users.find((u) => u.login === login) || null,
      createUser: async (login, passwordHash) => ({
        id: db.users.length + 1,
        login,
        passwordHash,
      }),
      userFavorites: [],
      getUserFavorites: async (userId, type) =>
        db.userFavorites.filter(
          (f) => f.userId === userId && (!type || f.type === type)
        ),
      addFavorite: async (userId, type, symbol) => {
        const newFav = {
          id: db.userFavorites.length + 1,
          userId,
          type,
          symbol,
        };
        db.userFavorites.push(newFav);
        return newFav;
      },
      removeFavorite: async (userId, type, symbol) => {
        const idx = db.userFavorites.findIndex(
          (f) => f.userId === userId && f.type === type && f.symbol === symbol
        );
        if (idx !== -1) {
          db.userFavorites.splice(idx, 1);
          return true;
        }
        return false;
      },
      userReports: [],
      createReport: async (userId, reportData) => {
        const newReport = {
          id: db.userReports.length + 1,
          userId,
          ...reportData,
        };
        db.userReports.push(newReport);
        return newReport;
      },
      getUserReports: async (userId) =>
        db.userReports.filter((r) => r.userId === userId),
    };

    const authService = {
      authenticate: async (login, hash) => {
        const u = await db.findUserByLogin(login);
        if (!u) return { success: false, message: "User not found" };
        if (hash !== u.passwordHash)
          return { success: false, message: "Invalid password" };
        return { success: true, userId: u.id, userName: u.login };
      },
      register: async (login, hash) => {
        const newUser = { id: db.users.length + 1, login, passwordHash: hash };
        db.users.push(newUser);
        return { success: true, userId: newUser.id };
      },
    };

    const coinLayerService = {};
    const alphaVantageService = {};
    const reportService = {
      generatePortfolioReport: async (userId) => {
        const newReport = {
          id: db.userReports.length + 1,
          type: "portfolio",
          userId,
          data: { favorites: { currencies: [], stocks: [] } },
        };
        db.userReports.push(newReport);
        return { success: true, report: newReport };
      },
      generateCurrencyComparisonReport: async (userId, symbols) => {
        const newReport = {
          id: db.userReports.length + 1,
          type: "currency_comparison",
          userId,
          symbols,
        };
        db.userReports.push(newReport);
        return { success: true, report: newReport };
      },
      formatReportAsCSV: (report) => {
        if (report.type === "portfolio") {
          return "Type,Symbol,Added Date\nCurrency,USD,2024-01-01\n";
        }
        return "Date,Currency,Rate,Change\n";
      },
      formatReportAsJSON: (report) => JSON.stringify(report),
    };

    // Store services
    app.set("database", db);
    app.set("authService", authService);
    app.set("coinLayerService", coinLayerService);
    app.set("alphaVantageService", alphaVantageService);
    app.set("reportService", reportService);

    // Routes
    app.get("/", (req, res) => {
      res.json({
        success: true,
        message: "FinDash Server is running",
        version: "1.0.0",
      });
    });

    app.get("/health", (req, res) => {
      res.json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
    });

    app.use("/api/auth", authRoutes);
    app.use("/api/currencies", currencyRoutes);
    app.use("/api/stocks", stockRoutes);
    app.use("/api/favorites", favoritesRoutes);
    app.use("/api/reports", reportRoutes);

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
      });
    });

    // Error handler
    app.use((err, req, res) => {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    });

    httpServer = http.createServer(app);
    // Don't actually listen, just use the app with supertest
  });

  afterAll(async () => {
    return new Promise((resolve) => {
      if (httpServer && httpServer.listening) {
        httpServer.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  describe("Health and Info Endpoints", () => {
    test("GET / should return server info", async () => {
      const response = await request(app).get("/");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("FinDash");
    });

    test("GET /health should return health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe("healthy");
    });

    test("GET /unknown should return 404", async () => {
      const response = await request(app).get("/unknown");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("Full Authentication Flow", () => {
    test("should register and login user", async () => {
      // Register
      const registerResponse = await request(app)
        .post("/api/auth/register")
        .send({
          login: "testuser",
          passwordHash: "testhash",
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);

      // Login
      const loginResponse = await request(app).post("/api/auth/login").send({
        login: "testuser",
        passwordHash: "testhash",
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.userId).toBeDefined();
    });
  });

  describe("Full Favorites Flow", () => {
    test("should add, get, and remove favorites", async () => {
      const userId = 1;

      // Add favorite
      const addResponse = await request(app).post("/api/favorites").send({
        userId,
        type: "currency",
        symbol: "BTC",
      });

      expect(addResponse.status).toBe(201);

      // Get favorites
      const getResponse = await request(app)
        .get("/api/favorites")
        .query({ userId, type: "currency" });

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.favorites.some((f) => f.symbol === "BTC")).toBe(
        true
      );

      // Remove favorite
      const removeResponse = await request(app).delete("/api/favorites").query({
        userId,
        type: "currency",
        symbol: "BTC",
      });

      expect(removeResponse.status).toBe(200);
    });
  });

  describe("Full Report Flow", () => {
    test("should create and download report", async () => {
      const userId = 1;

      // Create report
      const createResponse = await request(app)
        .post("/api/reports/portfolio")
        .send({ userId });

      expect(createResponse.status).toBe(201);
      const reportId = createResponse.body.report.id;

      // Download report
      const downloadResponse = await request(app)
        .get(`/api/reports/${reportId}/download`)
        .query({ userId, format: "json" });

      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers["content-type"]).toContain("json");
    });
  });
});
