import { describe, it, expect } from "vitest";
import { testConnection } from "./googleAnalytics";

describe("Google Analytics API", () => {
  it("should connect to GA4 successfully with valid credentials", async () => {
    const result = await testConnection();
    
    console.log("GA4 Connection Test Result:", JSON.stringify(result, null, 2));
    
    // If connection fails, show the error message for debugging
    if (!result.success) {
      console.error("Connection failed with message:", result.message);
    }
    
    expect(result.success, `Expected success but got: ${result.message}`).toBe(true);
    expect(result.propertyId).toBe("365376716");
    expect(result.message).toContain("Connected successfully");
  }, 30000); // 30 second timeout for API call
});
