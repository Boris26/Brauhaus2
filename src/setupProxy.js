const { createProxyMiddleware } = require("http-proxy-middleware");

const target = "https://braumeister.boris-mahne.de";

module.exports = function setupProxy(app) {
    app.use(
        createProxyMiddleware("/api/fermentation/ui", {
            target,
            changeOrigin: true,
            secure: false,
            ws: true,
            onError(aError, aRequest) {
                console.error(
                    `Development fermentation gateway proxy failed for ${aRequest.method} ${aRequest.url}:`,
                    aError.message
                );
            },
        })
    );

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
