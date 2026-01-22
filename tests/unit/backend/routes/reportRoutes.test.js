import { describe, test, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";
import reportRoutes from "../../../../backend/routes/reportRoutes.js";

describe("Report Routes", () => {
  let app;
  let db;
  let reportService;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    db = {
      userReports: [],
      createReport: async (userId, reportData) => {
        const newReport = {
          id: db.userReports.length + 1,
          userId,
          ...reportData,
          createdAt: new Date().toISOString(),
        };
        db.userReports.push(newReport);
        return newReport;
      },
      getUserReports: async (userId) =>
        db.userReports.filter((r) => r.userId === userId),
      findUserById: async (id) => ({ id, login: `user${id}` }),
    };
    reportService = {
      generateCurrencyComparisonReport: async (
        userId,
        symbols,
        startDate,
        endDate
      ) => {
        // Use parameters to satisfy linter (no-op)
        if (symbols && symbols.length) {
          /* no-op */
        }
        if (startDate && endDate) {
          /* no-op */
        }
        return {
          success: true,
          report: { id: 1, type: "currency_comparison", userId },
        };
      },
      generatePortfolioReport: async (userId) => ({
        success: true,
        report: { id: 1, type: "portfolio", userId },
      }),
      formatReportAsCSV: (report) => {
        if (report.type === "portfolio") {
          return "Type,Symbol,Added Date\nCurrency,USD,2024-01-01\n";
        }
        return "Date,Currency,Rate,Change\n";
      },
      formatReportAsJSON: (report) => JSON.stringify(report),
    };
    app.set("database", db);
    app.set("reportService", reportService);
    app.use("/api/reports", reportRoutes);
  });

  describe("GET /api/reports", () => {
    test("should get user reports", async () => {
      // Create a report first
      await db.createReport(1, { type: "test" });

      const response = await request(app)
        .get("/api/reports")
        .query({ userId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.reports).toBeDefined();
      expect(Array.isArray(response.body.reports)).toBe(true);
    });

    test("should require userId", async () => {
      const response = await request(app).get("/api/reports");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/reports/currency-comparison", () => {
    test("should generate currency comparison report", async () => {
      const response = await request(app)
        .post("/api/reports/currency-comparison")
        .send({
          userId: 1,
          symbols: ["USD", "EUR"],
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.type).toBe("currency_comparison");
    });

    test("should require all fields", async () => {
      const response = await request(app)
        .post("/api/reports/currency-comparison")
        .send({
          userId: 1,
          symbols: ["USD"],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("should require non-empty symbols array", async () => {
      const response = await request(app)
        .post("/api/reports/currency-comparison")
        .send({
          userId: 1,
          symbols: [],
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/reports/portfolio", () => {
    test("should generate portfolio report", async () => {
      const response = await request(app).post("/api/reports/portfolio").send({
        userId: 1,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.type).toBe("portfolio");
    });

    test("should require userId", async () => {
      const response = await request(app)
        .post("/api/reports/portfolio")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/reports/:reportId/download", () => {
    test("should download report as CSV", async () => {
      const report = await db.createReport(1, {
        type: "portfolio",
        data: {
          favorites: {
            currencies: [{ symbol: "USD", createdAt: "2024-01-01" }],
            stocks: [],
          },
        },
      });

      const response = await request(app)
        .get(`/api/reports/${report.id}/download`)
        .query({ userId: 1, format: "csv" });

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/csv");
      expect(response.text).toContain("Type,Symbol");
    });

    test("should download report as JSON", async () => {
      const report = await db.createReport(1, {
        type: "portfolio",
        data: { test: "data" },
      });

      const response = await request(app)
        .get(`/api/reports/${report.id}/download`)
        .query({ userId: 1, format: "json" });

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("application/json");
      const data = JSON.parse(response.text);
      expect(data.type).toBe("portfolio");
    });

    test("should reject invalid format", async () => {
      const report = await db.createReport(1, { type: "test" });

      const response = await request(app)
        .get(`/api/reports/${report.id}/download`)
        .query({ userId: 1, format: "xml" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("should return 404 for non-existent report", async () => {
      const response = await request(app)
        .get("/api/reports/999/download")
        .query({ userId: 1, format: "json" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test("should require userId", async () => {
      const report = await db.createReport(1, { type: "test" });

      const response = await request(app)
        .get(`/api/reports/${report.id}/download`)
        .query({ format: "json" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
