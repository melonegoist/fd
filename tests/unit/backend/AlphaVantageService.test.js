import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import AlphaVantageService from "../../../backend/services/AlphaVantageService.js";

// Mock fetch globally
global.fetch = jest.fn();

describe("AlphaVantageService", () => {
  let service;

  beforeEach(() => {
    service = new AlphaVantageService("test-api-key");
    fetch.mockClear();
  });

  describe("getQuote", () => {
    test("should fetch stock quote successfully", async () => {
      const mockResponse = {
        "Global Quote": {
          "01. symbol": "AAPL",
          "02. open": "150.00",
          "03. high": "155.00",
          "04. low": "149.00",
          "05. price": "152.50",
          "06. volume": "1000000",
          "07. latest trading day": "2024-01-01",
          "08. previous close": "150.00",
          "09. change": "2.50",
          "10. change percent": "1.67%",
        },
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await service.getQuote("AAPL");

      expect(result.success).toBe(true);
      expect(result.symbol).toBe("AAPL");
      expect(result.price).toBe(152.5);
      expect(result.volume).toBe(1000000);
    });

    test("should return mock data on API error", async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ "Error Message": "Invalid API call" }),
      });

      const result = await service.getQuote("AAPL");

      // Service returns mock data with success: true when API fails
      expect(result.success).toBe(true);
      expect(result.symbol).toBe("AAPL");
      expect(result.price).toBeDefined(); // Mock data
    });

    test("should return mock data on network error", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.getQuote("AAPL");

      // Service returns mock data with success: true when network fails
      expect(result.success).toBe(true);
      expect(result.symbol).toBe("AAPL");
      expect(result.price).toBeDefined();
    });

    test("should handle API limit message", async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ Note: "API call frequency limit reached" }),
      });

      const result = await service.getQuote("AAPL");

      // Service returns mock data with success: true when API limit reached
      expect(result.success).toBe(true);
      expect(result.symbol).toBe("AAPL");
      expect(result.price).toBeDefined();
    });
  });

  describe("getTimeSeries", () => {
    test("should fetch daily time series", async () => {
      const mockResponse = {
        "Meta Data": {
          "2. Symbol": "AAPL",
          "3. Last Refreshed": "2024-01-01",
          "5. Time Zone": "US/Eastern",
        },
        "Time Series (Daily)": {
          "2024-01-01": {
            "1. open": "150.00",
            "2. high": "155.00",
            "3. low": "149.00",
            "4. close": "152.50",
            "5. volume": "1000000",
          },
        },
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await service.getTimeSeries("AAPL", "daily");

      expect(result.success).toBe(true);
      expect(result.symbol).toBe("AAPL");
      expect(result.data).toHaveLength(1);
      expect(result.data[0].date).toBe("2024-01-01");
      expect(result.data[0].close).toBe(152.5);
    });

    test("should handle different intervals", async () => {
      const mockResponse = {
        "Meta Data": { "2. Symbol": "AAPL" },
        "Weekly Time Series": {
          "2024-01-01": {
            "1. open": "150.00",
            "2. high": "155.00",
            "3. low": "149.00",
            "4. close": "152.50",
            "5. volume": "1000000",
          },
        },
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await service.getTimeSeries("AAPL", "weekly");

      expect(result.success).toBe(true);
      expect(result.interval).toBe("weekly");
    });

    test("should return mock data on error", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.getTimeSeries("AAPL", "daily");

      expect(result.success).toBe(false);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("searchSymbol", () => {
    test("should search for symbols successfully", async () => {
      const mockResponse = {
        bestMatches: [
          {
            "1. symbol": "AAPL",
            "2. name": "Apple Inc.",
            "3. type": "Equity",
            "4. region": "United States",
            "5. marketOpen": "09:30",
            "6. marketClose": "16:00",
            "7. timezone": "UTC-5",
            "8. currency": "USD",
          },
        ],
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await service.searchSymbol("apple");

      expect(result.success).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].symbol).toBe("AAPL");
      expect(result.matches[0].name).toBe("Apple Inc.");
    });

    test("should return empty matches on error", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.searchSymbol("apple");

      expect(result.success).toBe(false);
      expect(result.matches).toEqual([]);
    });
  });

  describe("getMultipleQuotes", () => {
    test("should fetch multiple quotes", async () => {
      const mockQuote = {
        "Global Quote": {
          "01. symbol": "AAPL",
          "05. price": "150.00",
        },
      };

      fetch.mockResolvedValue({
        json: async () => mockQuote,
      });

      const result = await service.getMultipleQuotes(["AAPL", "MSFT"]);

      expect(result.success).toBe(true);
      expect(result.quotes).toBeDefined();
      expect(Object.keys(result.quotes).length).toBeGreaterThan(0);
    });
  });

  describe("Helper methods", () => {
    test("formatTimeSeriesData should format correctly", () => {
      const timeSeries = {
        "2024-01-01": {
          "1. open": "150.00",
          "2. high": "155.00",
          "3. low": "149.00",
          "4. close": "152.50",
          "5. volume": "1000000",
        },
      };

      const formatted = service.formatTimeSeriesData(timeSeries);

      expect(formatted).toHaveLength(1);
      expect(formatted[0].date).toBe("2024-01-01");
      expect(formatted[0].open).toBe(150.0);
      expect(formatted[0].close).toBe(152.5);
    });

    test("getMockQuote should return mock quote", () => {
      const quote = service.getMockQuote("AAPL");
      expect(quote.success).toBe(true);
      expect(quote.symbol).toBe("AAPL");
      expect(quote.price).toBeDefined();
      expect(quote.volume).toBeDefined();
    });

    test("getMockTimeSeries should return mock time series", () => {
      const data = service.getMockTimeSeries("AAPL", "daily");
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].date).toBeDefined();
      expect(data[0].close).toBeDefined();
    });
  });
});
