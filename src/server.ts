import http from "http";
import app from "./app";
import "dotenv/config";
import { connectDB } from "@connection/atlasDB";
import { logger } from "@shared/logger";
import Admin from "@models/adminModel";

const PORT = process.env.PORT || 8000;

async function startServer() : Promise<void> {
  try {
    await connectDB();
    const server = http.createServer(app);
    await Admin.findOrCreate();
    const shutdown = () => {
      logger.info("Shutting down server...");
      server.close((err) => {
        if (err) {
          logger.error("Error during server close:", err);
          process.exit(1);
        }
        logger.info("Server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    server.listen(PORT, () => {
      logger.info(`Server is running at PORT: ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start the server:", error);
    process.exit(1);
  }
}

startServer();
