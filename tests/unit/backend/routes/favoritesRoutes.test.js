import { describe, test, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";
import favoritesRoutes from "../../../../backend/routes/favoritesRoutes.js";

describe("Favorites Routes", () => {
  let app;
  let db;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    db = {
      userFavorites: [
        { id: 1, userId: 1, type: "currency", symbol: "USD" },
        { id: 2, userId: 1, type: "currency", symbol: "EUR" },
      ],
      getUserFavorites: async (userId, type) =>
        db.userFavorites.filter(
          (f) => f.userId === userId && (!type || f.type === type)
        ),
      addFavorite: async (userId, type, symbol) => {
        const exists = db.userFavorites.find(
          (f) => f.userId === userId && f.type === type && f.symbol === symbol
        );
        if (exists) return null;
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
        if (idx === -1) return false;
        db.userFavorites.splice(idx, 1);
        return true;
      },
    };
    app.set("database", db);
    app.use("/api/favorites", favoritesRoutes);
  });

  describe("GET /api/favorites", () => {
    test("should get user favorites", async () => {
      const response = await request(app)
        .get("/api/favorites")
        .query({ userId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.favorites).toBeDefined();
      expect(Array.isArray(response.body.favorites)).toBe(true);
    });

    test("should filter by type", async () => {
      const response = await request(app)
        .get("/api/favorites")
        .query({ userId: 1, type: "currency" });

      expect(response.status).toBe(200);
      expect(response.body.favorites.every((f) => f.type === "currency")).toBe(
        true
      );
    });

    test("should require userId", async () => {
      const response = await request(app).get("/api/favorites");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/favorites", () => {
    test("should add favorite", async () => {
      const response = await request(app).post("/api/favorites").send({
        userId: 1,
        type: "currency",
        symbol: "GBP",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.favorite).toBeDefined();
    });

    test("should fail if favorite already exists", async () => {
      // Add favorite first
      await db.addFavorite(1, "currency", "JPY");

      const response = await request(app).post("/api/favorites").send({
        userId: 1,
        type: "currency",
        symbol: "JPY",
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    test("should require all fields", async () => {
      const response = await request(app).post("/api/favorites").send({
        userId: 1,
        type: "currency",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("should reject invalid type", async () => {
      const response = await request(app).post("/api/favorites").send({
        userId: 1,
        type: "invalid",
        symbol: "USD",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /api/favorites", () => {
    test("should remove favorite", async () => {
      // Add favorite first
      await db.addFavorite(1, "currency", "CAD");

      const response = await request(app).delete("/api/favorites").query({
        userId: 1,
        type: "currency",
        symbol: "CAD",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("should return 404 if favorite not found", async () => {
      const response = await request(app).delete("/api/favorites").query({
        userId: 1,
        type: "currency",
        symbol: "NONEXISTENT",
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test("should require all query parameters", async () => {
      const response = await request(app).delete("/api/favorites").query({
        userId: 1,
        type: "currency",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
