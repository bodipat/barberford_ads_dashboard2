import { describe, expect, it } from "vitest";
import { isConfigured, testConnection } from "./googleAds";

describe("Google Ads API Integration", () => {
  it("should have API credentials configured", () => {
    const configured = isConfigured();
    expect(configured).toBe(true);
  });

  it("should successfully connect to Google Ads API", async () => {
    const result = await testConnection();
    
    console.log("Connection test result:", result);
    
    expect(result.success).toBe(true);
    expect(result.message).toContain("Successfully connected");
    expect(result.accountName).toBeDefined();
  }, 30000); // 30 second timeout for API call
});
