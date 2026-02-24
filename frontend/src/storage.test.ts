/**
 * Tests for storage and seed logic.
 * Uses in-memory storage to avoid IndexedDB in test environment.
 */
import { describe, it, expect } from "vitest";
import { createInMemoryStorage } from "./storage.js";
import { seedIfEmpty } from "./seed.js";
import { createSeedShaders } from "./seed-shaders.js";
import type { ShaderObject } from "./types.js";

describe("createInMemoryStorage", () => {
  it("returns empty array when no shaders", async () => {
    const storage = createInMemoryStorage();
    const all = await storage.getAll();
    expect(all).toEqual([]);
  });

  it("adds and retrieves shaders", async () => {
    const storage = createInMemoryStorage();
    const shader: ShaderObject = {
      id: "test-1",
      name: "Test",
      vertexSource: "v",
      fragmentSource: "f",
      createdAt: 123,
    };
    await storage.add(shader);
    const all = await storage.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(shader);
  });

  it("deletes shader by id", async () => {
    const storage = createInMemoryStorage();
    await storage.add({
      id: "del-me",
      name: "Delete",
      vertexSource: "v",
      fragmentSource: "f",
      createdAt: 0,
    });
    await storage.delete("del-me");
    const all = await storage.getAll();
    expect(all).toHaveLength(0);
  });
});

describe("seedIfEmpty", () => {
  it("seeds when storage is empty and returns true", async () => {
    const storage = createInMemoryStorage();
    const seeded = await seedIfEmpty(storage);
    expect(seeded).toBe(true);
    const all = await storage.getAll();
    expect(all).toHaveLength(6);
  });

  it("does not seed when storage has shaders but adds missing default seeds", async () => {
    const storage = createInMemoryStorage();
    await storage.add({
      id: "existing",
      name: "Existing",
      vertexSource: "v",
      fragmentSource: "f",
      createdAt: 0,
    });
    const seeded = await seedIfEmpty(storage);
    expect(seeded).toBe(false);
    const all = await storage.getAll();
    expect(all).toHaveLength(7);
    expect(all.some((s) => s.id === "existing")).toBe(true);
  });

  it("picks up new default shaders when storage has existing seeds", async () => {
    const storage = createInMemoryStorage();
    const seeds = createSeedShaders();
    for (let i = 0; i < 5; i++) {
      await storage.add(seeds[i]);
    }
    const seeded = await seedIfEmpty(storage);
    expect(seeded).toBe(false);
    const all = await storage.getAll();
    expect(all).toHaveLength(6);
    const names = all.map((s) => s.name).sort();
    expect(names).toEqual(["Circles", "Gradient", "Noise", "Plasma", "Rainbow", "Stripes"]);
  });
});

describe("createSeedShaders", () => {
  it("returns 6 shaders", () => {
    const shaders = createSeedShaders();
    expect(shaders).toHaveLength(6);
  });

  it("each shader has required fields", () => {
    const shaders = createSeedShaders();
    for (const s of shaders) {
      expect(s.id).toBeDefined();
      expect(typeof s.id).toBe("string");
      expect(s.name).toBeDefined();
      expect(s.vertexSource).toContain("a_position");
      expect(s.fragmentSource).toContain("u_time");
      expect(s.fragmentSource).toContain("u_resolution");
      expect(s.createdAt).toBeGreaterThan(0);
    }
  });

  it("shader names are distinct", () => {
    const shaders = createSeedShaders();
    const names = shaders.map((s) => s.name);
    expect(new Set(names).size).toBe(6);
  });
});
