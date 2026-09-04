const { createProxyMiddleware } = require("http-proxy-middleware");

const target = "https://braumeister.boris-mahne.de";

module.exports = function setupProxy(app) {
    app.use(
        "/api",
        createProxyMiddleware({
            target,
            changeOrigin: true,
            secure: false,
            onError(aError, aRequest) {
                console.error(
                    `Development API proxy failed for ${aRequest.method} ${aRequest.url}:`,
                    aError.message
                );
            },
        })
    );

    // Keep the Socket.IO proxy explicitly scoped to /socket.io so that
    // webpack-dev-server's own HMR websocket on /ws is not intercepted.
    app.use(
        createProxyMiddleware("/socket.io", {
            target,
            changeOrigin: true,
            secure: false,
            ws: true,
            onError(aError, aRequest) {
                console.error(
                    `Development Socket.IO proxy failed for ${aRequest.method} ${aRequest.url}:`,
                    aError.message
                );
            },
        })
    );
};
