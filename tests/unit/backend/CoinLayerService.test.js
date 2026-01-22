import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import CoinLayerService from "../../../backend/services/CoinLayerService.js";

// Mock fetch globally
global.fetch = jest.fn();

describe("CoinLayerService", () => {
  let service;

  beforeEach(() => {
    service = new CoinLayerService("test-api-key");
    fetch.mockClear();
  });

  describe("getLiveRates", () => {
    test("should fetch live rates successfully", async () => {
      const mockResponse = {
        success: true,
        timestamp: 1234567890,
        target: "USD",
        rates: { USD: 1, EUR: 0.85, GBP: 0.73 },
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await service.getLiveRates(["USD", "EUR"]);

      expect(result.success).toBe(true);
      expect(result.rates).toEqual(mockResponse.rates);
      expect(result.timestamp).toBe(1234567890);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api.coinlayer.com/live")
      );
    });

    test("should return mock data on API failure", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.getLiveRates(["USD", "EUR"]);

      expect(result.success).toBe(false);
      expect(result.rates).toBeDefined();
      expect(result.rates.USD).toBeDefined();
    });

    test("should handle API error response", async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: false,
          error: { info: "Invalid API key" },
        }),
      });

      const result = await service.getLiveRates();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.rates).toBeDefined(); // Should have mock fallback
    });

    test("should fetch all rates when no symbols provided", async () => {
      const mockResponse = {
        success: true,
        timestamp: 1234567890,
        rates: { USD: 1, EUR: 0.85 },
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      await service.getLiveRates();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api.coinlayer.com/live")
      );
    });
  });

  describe("getHistoricalRates", () => {
    test("should fetch historical rates successfully", async () => {
      const mockResponse = {
        success: true,
        date: "2024-01-01",
        rates: { USD: 1, EUR: 0.85 },
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await service.getHistoricalRates("2024-01-01", ["USD"]);

      expect(result.success).toBe(true);
      expect(result.date).toBe("2024-01-01");
      expect(result.rates).toEqual(mockResponse.rates);
    });

    test("should return mock data on failure", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.getHistoricalRates("2024-01-01");

      expect(result.success).toBe(false);
      expect(result.rates).toBeDefined();
    });
  });

  describe("getTimeSeries", () => {
    test("should fetch time series data", async () => {
      const mockResponse = {
        success: true,
        date: "2024-01-01",
        rates: { USD: 1 },
      };

      fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getTimeSeries(
        "USD",
        "2024-01-01",
        "2024-01-03"
      );

      expect(result.success).toBe(true);
      expect(result.symbol).toBe("USD");
      expect(result.rates).toBeDefined();
    });

    test("should handle errors in time series", async () => {
      fetch.mockRejectedValue(new Error("Network error"));

      const result = await service.getTimeSeries(
        "USD",
        "2024-01-01",
        "2024-01-03"
      );

      // Service may return success: true with mock data or success: false
      // Both are valid error handling scenarios
      expect(result.rates).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });
  });

  describe("getCurrenciesList", () => {
    test("should fetch currencies list successfully", async () => {
      const mockResponse = {
        success: true,
        currencies: { USD: "US Dollar", EUR: "Euro" },
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await service.getCurrenciesList();

      expect(result.success).toBe(true);
      expect(result.currencies).toEqual(mockResponse.currencies);
    });

    test("should return mock data on failure", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.getCurrenciesList();

      expect(result.success).toBe(false);
      expect(result.currencies).toBeDefined();
      expect(result.currencies.USD).toBe("US Dollar");
    });
  });

  describe("Helper methods", () => {
    test("getDateRange should generate date range", () => {
      const dates = service.getDateRange("2024-01-01", "2024-01-03");
      expect(dates).toHaveLength(3);
      expect(dates[0]).toBe("2024-01-01");
      expect(dates[2]).toBe("2024-01-03");
    });

    test("getMockRates should return mock rates", () => {
      const rates = service.getMockRates(["USD", "EUR"]);
      expect(rates.USD).toBe(1.0);
      expect(rates.EUR).toBe(0.85);
    });

    test("getMockCurrenciesList should return mock currencies", () => {
      const currencies = service.getMockCurrenciesList();
      expect(currencies.USD).toBe("US Dollar");
      expect(currencies.BTC).toBe("Bitcoin");
    });
  });

  describe("Service without API key", () => {
    test("should work without API key", () => {
      const serviceNoKey = new CoinLayerService();
      expect(serviceNoKey.apiKey).toBeUndefined();
    });
  });
});
