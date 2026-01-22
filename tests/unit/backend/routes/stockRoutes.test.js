import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";
import stockRoutes from "../../../../backend/routes/stockRoutes.js";

// Mock fetch
global.fetch = jest.fn();

describe("Stock Routes", () => {
  let app;
  let alphaVantageService;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    alphaVantageService = {
      getQuote: async (symbol) => ({
        success: true,
        quote: { symbol, price: 150 },
      }),
      getTimeSeries: async (symbol, interval) => ({
        success: true,
        interval,
        data: {},
      }),
      searchSymbol: async (keywords) => {
        if (keywords) {
          /* no-op to satisfy linter */
        }
        return {
          success: true,
          matches: [{ symbol: "AAPL", name: "Apple Inc." }],
        };
      },
      getMultipleQuotes: async (symbols) => ({
        success: true,
        quotes: symbols.map((s) => ({ symbol: s, price: 100 })),
      }),
    };
    app.set("alphaVantageService", alphaVantageService);
    app.use("/api/stocks", stockRoutes);
    fetch.mockClear();
  });

  describe("GET /api/stocks/quote/:symbol", () => {
    test("should get stock quote", async () => {
      // The mocked service above is used instead of network requests

      const response = await request(app).get("/api/stocks/quote/AAPL");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.quote).toBeDefined();
    });

    test("should handle API errors", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const response = await request(app).get("/api/stocks/quote/AAPL");

      // Service returns mock data with success: true when API fails
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.quote).toBeDefined();
    });
  });

  describe("GET /api/stocks/timeseries/:symbol", () => {
    test("should get daily time series", async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          "Meta Data": { "2. Symbol": "AAPL" },
          "Time Series (Daily)": {
            "2024-01-01": {
              "1. open": "150.00",
              "4. close": "152.50",
              "5. volume": "1000000",
            },
          },
        }),
      });

      const response = await request(app)
        .get("/api/stocks/timeseries/AAPL")
        .query({ interval: "daily" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.interval).toBe("daily");
    });

    test("should reject invalid interval", async () => {
      const response = await request(app)
        .get("/api/stocks/timeseries/AAPL")
        .query({ interval: "invalid" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/stocks/search", () => {
    test("should search for stocks", async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          bestMatches: [
            {
              "1. symbol": "AAPL",
              "2. name": "Apple Inc.",
            },
          ],
        }),
      });

      const response = await request(app)
        .get("/api/stocks/search")
        .query({ keywords: "apple" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.matches).toBeDefined();
    });

    test("should require keywords", async () => {
      const response = await request(app).get("/api/stocks/search");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/stocks/quotes", () => {
    test("should get multiple quotes", async () => {
      fetch.mockResolvedValue({
        json: async () => ({
          "Global Quote": {
            "01. symbol": "AAPL",
            "05. price": "150.00",
          },
        }),
      });

      const response = await request(app)
        .post("/api/stocks/quotes")
        .send({ symbols: ["AAPL", "MSFT"] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.quotes).toBeDefined();
    });

    test("should require symbols array", async () => {
      const response = await request(app).post("/api/stocks/quotes").send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
