import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";
import currencyRoutes from "../../../../backend/routes/currencyRoutes.js";
import CoinLayerService from "../../../../backend/services/CoinLayerService.js";

// Mock fetch
global.fetch = jest.fn();

describe("Currency Routes", () => {
  let app;
  let coinLayerService;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    coinLayerService = new CoinLayerService("test-key");
    app.set("coinLayerService", coinLayerService);
    app.use("/api/currencies", currencyRoutes);
    fetch.mockClear();
  });

  describe("GET /api/currencies", () => {
    test("should get currencies list", async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          currencies: { USD: "US Dollar", EUR: "Euro" },
        }),
      });

      const response = await request(app).get("/api/currencies");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.currencies).toBeDefined();
    });

    test("should handle API errors", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const response = await request(app).get("/api/currencies");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/currencies/rates", () => {
    test("should get live rates", async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          timestamp: 1234567890,
          rates: { USD: 1, EUR: 0.85 },
          target: "USD",
        }),
      });

      const response = await request(app)
        .get("/api/currencies/rates")
        .query({ symbols: "USD,EUR" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rates).toBeDefined();
    });

    test("should get rates without symbols", async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          rates: { USD: 1 },
        }),
      });

      const response = await request(app).get("/api/currencies/rates");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("GET /api/currencies/historical/:date", () => {
    test("should get historical rates", async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          date: "2024-01-01",
          rates: { USD: 1, EUR: 0.85 },
        }),
      });

      const response = await request(app)
        .get("/api/currencies/historical/2024-01-01")
        .query({ symbols: "USD,EUR" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.date).toBe("2024-01-01");
    });

    test("should reject invalid date format", async () => {
      const response = await request(app)
        .get("/api/currencies/historical/invalid-date")
        .query({ symbols: "USD" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid date format");
    });
  });

  describe("GET /api/currencies/timeseries/:symbol", () => {
    test("should get time series data", async () => {
      fetch.mockResolvedValue({
        json: async () => ({
          success: true,
          date: "2024-01-01",
          rates: { USD: 1 },
        }),
      });

      const response = await request(app)
        .get("/api/currencies/timeseries/USD")
        .query({
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.symbol).toBe("USD");
    });

    test("should require startDate and endDate", async () => {
      const response = await request(app).get("/api/currencies/timeseries/USD");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("startDate and endDate");
    });

    test("should reject invalid date format", async () => {
      const response = await request(app)
        .get("/api/currencies/timeseries/USD")
        .query({
          startDate: "invalid",
          endDate: "2024-01-31",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
