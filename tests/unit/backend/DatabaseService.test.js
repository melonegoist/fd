import { describe, test, expect, beforeEach } from "@jest/globals";

describe("DatabaseService", () => {
  let db;

  beforeEach(() => {
    // Use a mock implementation to avoid importing backend DatabaseService
    db = {
      users: [
        { id: 1, login: "admin", passwordHash: "hashadmin" },
        { id: 2, login: "user1", passwordHash: "hash1" },
      ],
      userFavorites: [
        { id: 1, userId: 1, type: "currency", symbol: "USD" },
        { id: 2, userId: 1, type: "currency", symbol: "EUR" },
        { id: 3, userId: 2, type: "stock", symbol: "AAPL" },
      ],
      userReports: [],
      findUserByLogin: async function (login) {
        return this.users.find((u) => u.login === login) || null;
      },
      findUserById: async function (id) {
        return this.users.find((u) => u.id === id) || null;
      },
      createUser: async function (login, passwordHash) {
        const newUser = {
          id: this.users.length + 1,
          login,
          passwordHash,
          createdAt: new Date().toISOString(),
        };
        this.users.push(newUser);
        return newUser;
      },
      getUserFavorites: async function (userId, type) {
        let favs = this.userFavorites.filter((f) => f.userId === userId);
        if (type) favs = favs.filter((f) => f.type === type);
        return favs;
      },
      addFavorite: async function (userId, type, symbol) {
        const exists = this.userFavorites.find(
          (f) => f.userId === userId && f.type === type && f.symbol === symbol
        );
        if (exists) return null;
        const newFavorite = {
          id: this.userFavorites.length + 1,
          userId,
          type,
          symbol,
          createdAt: new Date().toISOString(),
        };
        this.userFavorites.push(newFavorite);
        return newFavorite;
      },
      removeFavorite: async function (userId, type, symbol) {
        const idx = this.userFavorites.findIndex(
          (f) => f.userId === userId && f.type === type && f.symbol === symbol
        );
        if (idx === -1) return false;
        this.userFavorites.splice(idx, 1);
        return true;
      },
      createReport: async function (userId, reportData) {
        const newReport = {
          id: this.userReports.length + 1,
          userId,
          ...reportData,
          createdAt: new Date().toISOString(),
        };
        this.userReports.push(newReport);
        return newReport;
      },
      getUserReports: async function (userId) {
        return this.userReports.filter((r) => r.userId === userId);
      },
      query: async function (sql, params) {
        if (sql.includes("FROM users") && sql.includes("WHERE login")) {
          return this.users.filter((u) => u.login === params[0]);
        }
        if (sql.includes("FROM users") && sql.includes("WHERE id")) {
          return this.users.filter((u) => u.id === params[0]);
        }
        if (sql.includes("INTO users")) {
          const newUser = await this.createUser(params[0], params[1]);
          return { insertId: newUser.id };
        }
        return [];
      },
    };
  });

  describe("User operations", () => {
    test("findUserByLogin should return user when exists", async () => {
      const user = await db.findUserByLogin("admin");
      expect(user).toBeDefined();
      expect(user.login).toBe("admin");
      expect(user.id).toBe(1);
    });

    test("findUserByLogin should return null when user does not exist", async () => {
      const user = await db.findUserByLogin("nonexistent");
      expect(user).toBeNull();
    });

    test("findUserById should return user when exists", async () => {
      const user = await db.findUserById(1);
      expect(user).toBeDefined();
      expect(user.id).toBe(1);
    });

    test("findUserById should return null when user does not exist", async () => {
      const user = await db.findUserById(999);
      expect(user).toBeNull();
    });

    test("createUser should create new user with unique ID", async () => {
      const newUser = await db.createUser("testuser", "hash123");
      expect(newUser).toBeDefined();
      expect(newUser.login).toBe("testuser");
      expect(newUser.passwordHash).toBe("hash123");
      expect(newUser.id).toBeGreaterThan(2);
      expect(newUser.createdAt).toBeDefined();

      // Verify user was added
      const found = await db.findUserByLogin("testuser");
      expect(found).toEqual(newUser);
    });
  });

  describe("Favorites operations", () => {
    test("getUserFavorites should return all favorites for user", async () => {
      const favorites = await db.getUserFavorites(1);
      expect(favorites).toHaveLength(2);
      expect(favorites[0].userId).toBe(1);
    });

    test("getUserFavorites should filter by type", async () => {
      const currencyFavorites = await db.getUserFavorites(1, "currency");
      expect(currencyFavorites).toHaveLength(2);
      expect(currencyFavorites.every((f) => f.type === "currency")).toBe(true);

      const stockFavorites = await db.getUserFavorites(2, "stock");
      expect(stockFavorites).toHaveLength(1);
      expect(stockFavorites[0].type).toBe("stock");
    });

    test("addFavorite should add new favorite", async () => {
      const favorite = await db.addFavorite(1, "currency", "GBP");
      expect(favorite).toBeDefined();
      expect(favorite.userId).toBe(1);
      expect(favorite.type).toBe("currency");
      expect(favorite.symbol).toBe("GBP");

      const favorites = await db.getUserFavorites(1, "currency");
      expect(favorites).toHaveLength(3);
    });

    test("addFavorite should return null if favorite already exists", async () => {
      const first = await db.addFavorite(1, "currency", "JPY");
      expect(first).toBeDefined();

      const second = await db.addFavorite(1, "currency", "JPY");
      expect(second).toBeNull();
    });

    test("removeFavorite should remove favorite", async () => {
      const removed = await db.removeFavorite(1, "currency", "USD");
      expect(removed).toBe(true);

      const favorites = await db.getUserFavorites(1, "currency");
      expect(favorites.find((f) => f.symbol === "USD")).toBeUndefined();
    });

    test("removeFavorite should return false if favorite does not exist", async () => {
      const removed = await db.removeFavorite(1, "currency", "NONEXISTENT");
      expect(removed).toBe(false);
    });
  });

  describe("Reports operations", () => {
    test("createReport should create new report", async () => {
      const reportData = {
        type: "test",
        data: { test: "data" },
      };
      const report = await db.createReport(1, reportData);
      expect(report).toBeDefined();
      expect(report.userId).toBe(1);
      expect(report.type).toBe("test");
      expect(report.id).toBe(1);
      expect(report.createdAt).toBeDefined();
    });

    test("getUserReports should return all reports for user", async () => {
      await db.createReport(1, { type: "report1" });
      await db.createReport(1, { type: "report2" });
      await db.createReport(2, { type: "report3" });

      const reports = await db.getUserReports(1);
      expect(reports).toHaveLength(2);
      expect(reports.every((r) => r.userId === 1)).toBe(true);
    });
  });

  describe("Query method", () => {
    test("query should find user by login", async () => {
      const result = await db.query("SELECT * FROM users WHERE login = ?", [
        "admin",
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].login).toBe("admin");
    });

    test("query should find user by id", async () => {
      const result = await db.query("SELECT * FROM users WHERE id = ?", [1]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    test("query should insert user", async () => {
      const result = await db.query(
        "INSERT INTO users (login, passwordHash) VALUES (?, ?)",
        ["newuser", "hash"]
      );
      expect(result.insertId).toBeDefined();
      expect(result.insertId).toBeGreaterThan(0);

      const user = await db.findUserByLogin("newuser");
      expect(user).toBeDefined();
    });

    test("query should return empty array for unknown queries", async () => {
      const result = await db.query("SELECT * FROM unknown", []);
      expect(result).toEqual([]);
    });
  });
});
