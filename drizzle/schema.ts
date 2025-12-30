import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Campaigns table - stores the three Barberford location campaigns
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  location: mysqlEnum("location", ["erawan", "noir", "reserve"]).notNull(),
  dailyBudget: decimal("dailyBudget", { precision: 10, scale: 2 }).notNull(),
  totalBudget: decimal("totalBudget", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["active", "paused", "ended"]).default("active").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/**
 * Daily metrics table - stores daily performance data for each campaign
 */
export const dailyMetrics = mysqlTable("daily_metrics", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  date: date("date").notNull(),
  impressions: int("impressions").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  conversions: int("conversions").default(0).notNull(),
  spend: decimal("spend", { precision: 10, scale: 2 }).default("0").notNull(),
  ctr: decimal("ctr", { precision: 5, scale: 2 }).default("0").notNull(),
  cpc: decimal("cpc", { precision: 10, scale: 2 }).default("0").notNull(),
  conversionRate: decimal("conversionRate", { precision: 5, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type InsertDailyMetric = typeof dailyMetrics.$inferInsert;

/**
 * Keywords table - stores keyword performance data
 */
export const keywords = mysqlTable("keywords", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  matchType: mysqlEnum("matchType", ["exact", "phrase", "broad"]).notNull(),
  qualityScore: int("qualityScore").default(5).notNull(),
  impressions: int("impressions").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  conversions: int("conversions").default(0).notNull(),
  spend: decimal("spend", { precision: 10, scale: 2 }).default("0").notNull(),
  cpc: decimal("cpc", { precision: 10, scale: 2 }).default("0").notNull(),
  status: mysqlEnum("status", ["active", "paused"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Keyword = typeof keywords.$inferSelect;
export type InsertKeyword = typeof keywords.$inferInsert;

/**
 * Ad groups table - stores ad group performance data
 */
export const adGroups = mysqlTable("ad_groups", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  impressions: int("impressions").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  conversions: int("conversions").default(0).notNull(),
  spend: decimal("spend", { precision: 10, scale: 2 }).default("0").notNull(),
  cpc: decimal("cpc", { precision: 10, scale: 2 }).default("0").notNull(),
  status: mysqlEnum("status", ["active", "paused"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdGroup = typeof adGroups.$inferSelect;
export type InsertAdGroup = typeof adGroups.$inferInsert;
