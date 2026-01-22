import { describe, test, expect, beforeEach } from "@jest/globals";
import AuthService from "../../../backend/services/AuthService.js";

describe("AuthService", () => {
  let db;
  let authService;

  beforeEach(() => {
    // Use a simple mock db object to avoid importing the full DatabaseService
    db = {
      users: [
        {
          id: 1,
          login: "admin",
          passwordHash:
            "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
        },
      ],
      findUserByLogin: async function (login) {
        return this.users.find((u) => u.login === login) || null;
      },
      createUser: async function (login, passwordHash) {
        const exists = this.users.find((u) => u.login === login);
        if (exists) return null;
        const newUser = { id: this.users.length + 1, login, passwordHash };
        this.users.push(newUser);
        return newUser;
      },
    };
    authService = new AuthService(db);
  });

  describe("authenticate", () => {
    test("should authenticate user with valid credentials", async () => {
      const result = await authService.authenticate(
        "admin",
        "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe(1);
      expect(result.userName).toBe("admin");
      expect(result.message).toBe("Authentication successful");
    });

    test("should fail with invalid password", async () => {
      const result = await authService.authenticate("admin", "wronghash");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid password");
      expect(result.userId).toBeUndefined();
    });

    test("should fail with non-existent user", async () => {
      const result = await authService.authenticate("nonexistent", "hash");

      expect(result.success).toBe(false);
      expect(result.message).toBe("User not found");
    });

    test("should fail with invalid login type", async () => {
      const result = await authService.authenticate(null, "hash");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid login provided");
    });

    test("should fail with invalid passwordHash type", async () => {
      const result = await authService.authenticate("admin", null);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid password or passwordHash provided");
    });

    test("should handle database errors gracefully", async () => {
      const errorDb = {
        findUserByLogin: async () => {
          throw new Error("Database error");
        },
      };
      const errorAuthService = new AuthService(errorDb);

      const result = await errorAuthService.authenticate("admin", "hash");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Authentication error");
    });
  });

  describe("register", () => {
    test("should register new user successfully", async () => {
      const result = await authService.register("newuser", "hash123");

      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
      expect(result.message).toBe("User registered successfully");

      // Verify user was created
      const user = await db.findUserByLogin("newuser");
      expect(user).toBeDefined();
      expect(user.passwordHash).toBe("hash123");
    });

    test("should fail if user already exists", async () => {
      const result = await authService.register("admin", "hash123");

      expect(result.success).toBe(false);
      expect(result.message).toBe("User already exists");
    });

    test("should fail with invalid login", async () => {
      const result = await authService.register(null, "hash123");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid login");
    });

    test("should fail with invalid passwordHash", async () => {
      const result = await authService.register("newuser", null);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid password hash");
    });

    test("should handle registration errors gracefully", async () => {
      const errorDb = {
        findUserByLogin: async () => null,
        createUser: async () => {
          throw new Error("Database error");
        },
      };
      const errorAuthService = new AuthService(errorDb);

      const result = await errorAuthService.register("newuser", "hash");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Registration error");
    });
  });

  describe("findUserByLogin", () => {
    test("should find user using database method", async () => {
      const user = await authService.findUserByLogin("admin");

      expect(user).toBeDefined();
      expect(user.login).toBe("admin");
    });

    test("should return null for non-existent user", async () => {
      const user = await authService.findUserByLogin("nonexistent");

      expect(user).toBeNull();
    });

    test("should fallback to query method if findUserByLogin not available", async () => {
      const queryDb = {
        query: async (sql) => {
          if (sql.includes("WHERE login")) {
            return [{ id: 1, login: "admin", passwordHash: "hash" }];
          }
          return [];
        },
      };
      const queryAuthService = new AuthService(queryDb);

      const user = await queryAuthService.findUserByLogin("admin");

      expect(user).toBeDefined();
      expect(user.login).toBe("admin");
    });
  });
});
