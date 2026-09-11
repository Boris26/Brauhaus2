const mockProxyMiddleware = jest.fn();
const mockCreateProxyMiddleware = jest.fn(() => mockProxyMiddleware);

jest.mock('http-proxy-middleware', () => ({
    createProxyMiddleware: (...args) => mockCreateProxyMiddleware(...args),
}));

const setupProxy = require('./setupProxy');

describe('development API proxy', () => {
    beforeEach(() => jest.clearAllMocks());
    it('forwards the complete /api namespace without rewriting paths or filtering methods', () => {
        const app = { use: jest.fn() };

        setupProxy(app);

        expect(app.use).toHaveBeenCalledWith('/api', mockProxyMiddleware);
        expect(mockCreateProxyMiddleware).toHaveBeenNthCalledWith(2, expect.objectContaining({
            target: 'https://braumeister.boris-mahne.de',
            changeOrigin: true,
            secure: false,
        }));

        const proxyOptions = mockCreateProxyMiddleware.mock.calls[1][0];
        expect(proxyOptions).not.toHaveProperty('pathRewrite');
        expect(proxyOptions).not.toHaveProperty('method');
    });

    it('routes the native fermentation websocket to the local gateway with a rewritten path', () => {
        const app = { use: jest.fn() };

        setupProxy(app);

        expect(app.use).toHaveBeenNthCalledWith(1, mockProxyMiddleware);
        expect(mockCreateProxyMiddleware).toHaveBeenNthCalledWith(1, '/api/fermentation/ui', expect.objectContaining({
            target: 'http://localhost:5001',
            changeOrigin: true,
            ws: true,
            pathRewrite: {'^/api/fermentation/ui': '/fermentation/ui'},
        }));
    });
});
