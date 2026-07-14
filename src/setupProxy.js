const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function setupProxy(app) {
    app.use(
        "/api",
        createProxyMiddleware({
            target: "https://192.168.178.72",
            changeOrigin: true,
            secure: false,
            onError(aError, aRequest) {
                console.error(
                    `Development proxy failed for ${aRequest.method} ${aRequest.url}:`,
                    aError.message
                );
            },
        })
    );
};
