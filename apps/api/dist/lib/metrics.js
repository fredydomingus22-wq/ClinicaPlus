"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemMetrics = void 0;
/**
 * Simple in-memory metrics for the API.
 * In a real production environment, you might use Prometheus or another dedicated tool.
 */
exports.systemMetrics = {
    requests_total: 0,
    errors_5xx_total: 0,
    startTime: Date.now(),
    /**
     * Resets all metrics (optional).
     */
    reset() {
        this.requests_total = 0;
        this.errors_5xx_total = 0;
        this.startTime = Date.now();
    }
};
