const fs = require("fs");
const path = require("path");

function checkDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      checkDirectory(fullPath);
    } else if (file.name.endsWith(".ts") || file.name.endsWith(".tsx")) {
      const content = fs.readFileSync(fullPath, "utf8");
      if (/EventSource\([^)]*withCredentials\s*:\s*true/i.test(content)) {
        console.error(`❌ Error in ${fullPath}: Do not use withCredentials on EventSource. SSE is public.`);
        process.exit(1);
      }
      // Guard against accidental trailing spaces in SSE URLs
      if (/\/events\/stream\s+['"`]/i.test(content)) {
        console.error(`❌ Error in ${fullPath}: Trailing space detected in /events/stream URL.`);
        process.exit(1);
      }
    }
  }
}

try {
  checkDirectory("src");
  console.log("✅ SSE check passed: no withCredentials or trailing spaces found");
} catch (error) {
  console.error("❌ SSE check failed:", error.message);
  process.exit(1);
}
