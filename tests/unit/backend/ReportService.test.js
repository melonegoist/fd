import { describe, test, expect, beforeEach } from "@jest/globals";
import ReportService from "../../../backend/services/ReportService.js";

describe("ReportService", () => {
  let db;
  let reportService;

  beforeEach(() => {
    // Mock DB for ReportService to avoid importing DatabaseService
    db = {
      userFavorites: [],
      userReports: [],
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
          createdAt: new Date().toISOString(),
        };
        db.userFavorites.push(newFav);
        return newFav;
      },
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
    };
    reportService = new ReportService(db);
  });

  describe("generateCurrencyComparisonReport", () => {
    test("should generate currency comparison report", async () => {
      const result = await reportService.generateCurrencyComparisonReport(
        1,
        ["USD", "EUR"],
        "2024-01-01",
        "2024-01-31"
      );

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report.type).toBe("currency_comparison");
      expect(result.report.userId).toBe(1);
      expect(result.report.symbols).toEqual(["USD", "EUR"]);
    });

    test("should save report to database", async () => {
      await reportService.generateCurrencyComparisonReport(
        1,
        ["USD"],
        "2024-01-01",
        "2024-01-31"
      );

      const reports = await db.getUserReports(1);
      expect(reports.length).toBeGreaterThan(0);
      expect(reports[reports.length - 1].type).toBe("currency_comparison");
    });
  });

  describe("generatePortfolioReport", () => {
    test("should generate portfolio report", async () => {
      // Add some favorites first
      await db.addFavorite(1, "currency", "USD");
      await db.addFavorite(1, "stock", "AAPL");

      const result = await reportService.generatePortfolioReport(1);

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report.type).toBe("portfolio");
      expect(result.report.data.favorites.currencies.length).toBeGreaterThan(0);
      expect(result.report.data.favorites.stocks.length).toBeGreaterThan(0);
    });

    test("should include summary in portfolio report", async () => {
      const result = await reportService.generatePortfolioReport(1);

      expect(result.report.data.summary).toBeDefined();
      expect(result.report.data.summary.totalItems).toBeDefined();
      expect(result.report.data.summary.currenciesCount).toBeDefined();
      expect(result.report.data.summary.stocksCount).toBeDefined();
    });
  });

  describe("formatReportAsCSV", () => {
    test("should format currency comparison report as CSV", () => {
      const report = {
        type: "currency_comparison",
        data: {},
      };

      const csv = reportService.formatReportAsCSV(report);
      expect(csv).toContain("Date,Currency,Rate,Change");
    });

    test("should format portfolio report as CSV", () => {
      const report = {
        type: "portfolio",
        data: {
          favorites: {
            currencies: [
              { symbol: "USD", createdAt: "2024-01-01" },
              { symbol: "EUR", createdAt: "2024-01-02" },
            ],
            stocks: [{ symbol: "AAPL", createdAt: "2024-01-03" }],
          },
        },
      };

      const csv = reportService.formatReportAsCSV(report);
      expect(csv).toContain("Type,Symbol,Added Date");
      expect(csv).toContain("Currency,USD");
      expect(csv).toContain("Stock,AAPL");
    });
  });

  describe("formatReportAsJSON", () => {
    test("should format report as JSON", () => {
      const report = {
        type: "test",
        data: { test: "data" },
      };

      const json = reportService.formatReportAsJSON(report);
      const parsed = JSON.parse(json);

      expect(parsed.type).toBe("test");
      expect(parsed.data.test).toBe("data");
    });
  });
});
